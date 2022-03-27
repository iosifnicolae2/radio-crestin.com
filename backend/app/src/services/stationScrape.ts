import {Promise as BluebirdPromise} from "bluebird";
import {Station, StationNowPlaying, StationUptime} from "@/types";
import axios, {AxiosRequestConfig} from "axios";
import {PROJECT_ENV} from "@/env";
import {Logger} from "tslog";


const logger: Logger = new Logger({name: "stationScrape"});

const statsFormatter = (stats: StationNowPlaying) => {
    if (stats.current_song) {
        const allowedCharacters = /[^a-zA-ZÀ-žaâăáeéèiîoóöőøsșşșştțţțţ\-\s?'&]/g;
        // TODO: if name has fewer than 3 characters set it to empty
        // Decode Unicode special chars
        stats.current_song = {
            name: stats.current_song.name
                .replace(/&#(\d+);/g, function (match, dec) {
                    return String.fromCharCode(dec);
                })
                .replace("_", " ")
                .replace("  ", " ")
                .replace(allowedCharacters, "")
                .replace(/^[a-z]/, function (m) {
                    return m.toUpperCase()
                }),

            artist: stats.current_song.artist
                .replace(/&#(\d+);/g, function (match, dec) {
                    return String.fromCharCode(dec);
                })
                .replace("_", " ")
                .replace("  ", " ")
                .replace(allowedCharacters, "")
                .replace(/^[a-z]/, function (m) {
                    return m.toUpperCase()
                }),
        }
    }
    if (stats.current_song?.name?.length && stats.current_song?.name?.length < 3) {
        if (stats.current_song) {
            stats.current_song.name = "";
        }
    }
    return stats
}

const extractNowPlaying = async ({
                                     url,
                                     headers,
                                     statsExtractor,
                                     decodeJson
                                 }: { url: string, headers?: any, statsExtractor: (data: any) => StationNowPlaying, decodeJson: boolean }): Promise<StationNowPlaying> => {
    const options: AxiosRequestConfig = {
        method: 'GET',
        url,
        headers,
    };

    return axios.request(options)
        .then(response => {
            return response.data;
        })
        .then(async (data) => {
            return {
                ...statsFormatter(statsExtractor(data)),
                raw_data: data,
            }
        })
        .catch(error => {
            logger.error(`Cannot extract stats from ${url}. error:`, error)
            return {
                timestamp: (new Date()).toISOString(),
                current_song: null,
                listeners: null,
                raw_data: {},
                error: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
            }
        });
}

const extractShoutcastNowPlaying = async ({shoutcast_stats_url}: { shoutcast_stats_url: string }): Promise<StationNowPlaying> => {
    return extractNowPlaying({
        url: shoutcast_stats_url,
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
        decodeJson: true,
        statsExtractor: (data) => {
            const [firstPart, lastPart] = data["songtitle"]?.split(" - ") || ["", ""];
            let songName, artist;
            if (firstPart && lastPart) {
                songName = lastPart;
                artist = firstPart;
            } else {
                songName = firstPart;
                artist = "";
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song: {
                    name: songName?.trim(),
                    artist: artist?.trim()
                } || null,
                listeners: data["currentlisteners"] || null,
            };
        }
    });
}

const extractRadioCoNowPlaying = async ({radio_co_stats_url}: { radio_co_stats_url: string }): Promise<StationNowPlaying> => {
    return extractNowPlaying({
        url: radio_co_stats_url,
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
        decodeJson: true,
        statsExtractor: (data) => {
            const [firstPart, lastPart] = data["current_track"]["title"]?.split(" - ") || ["", ""];
            let songName, artist;
            if (firstPart && lastPart) {
                artist = firstPart;
                songName = lastPart;
            } else {
                songName = firstPart;
                artist = "";
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song: {
                    name: songName?.trim(),
                    artist: artist?.trim()
                } || null,
                listeners: data["currentlisteners"] || null,
            };
        }
    });
}

const extractIcecastNowPlaying = async ({icecast_stats_url}: { icecast_stats_url: string }): Promise<StationNowPlaying> => {
    return extractNowPlaying({
        url: icecast_stats_url,
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
        decodeJson: true,
        statsExtractor: (data) => {
            let listenurl = /listen_url=(?<listen_url>.+)/gmi.exec(icecast_stats_url)?.groups?.listen_url || "";
            let source = data["icestats"]["source"].find((source: any) => source.listenurl.includes(listenurl));

            const [firstPart, lastPart] = source["title"]?.split(" - ") || ["", ""];
            let songName, artist;
            if (firstPart && lastPart) {
                artist = firstPart;
                songName = lastPart;
            } else {
                songName = firstPart;
                artist = "";
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song: {
                    name: songName?.trim(),
                    artist: artist?.trim()
                } || null,
                listeners: source["listeners"] || null,
            };
        }
    });
}

const extractShoutcastXmlNowPlaying = async ({shoutcast_xml_stats_url}: { shoutcast_xml_stats_url: string }): Promise<StationNowPlaying> => {
    return extractNowPlaying({
        url: shoutcast_xml_stats_url,
        headers: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "cache-control": "max-age=0",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1"
        },
        decodeJson: false,
        statsExtractor: (xml_page) => {
            let regex = /<(?<param_data>[a-zA-Z\s]+)>(?<value>(.*?))<\//mg;
            let data: any = {};
            let m;
            xml_page = xml_page.replace("SHOUTCASTSERVER", "");
            while ((m = regex.exec(xml_page)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }

                if (m?.groups?.param_data) {
                    data[m?.groups?.param_data] = m?.groups?.value
                }
            }

            const [firstPart, lastPart] = data["SONGTITLE"]?.split(" - ") || ["", ""];
            let songName, artist;
            if (firstPart && lastPart) {
                artist = firstPart;
                songName = lastPart;
            } else {
                songName = firstPart;
                artist = "";
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song: {
                    name: songName?.trim(),
                    artist: artist?.trim()
                } || null,
                listeners: data["CURRENTLISTENERS"] || null,
            };
        }
    });
}

const extractOldIcecastHtmlNowPlaying = async ({old_icecast_html_stats_url}: { old_icecast_html_stats_url: string }): Promise<StationNowPlaying> => {
    return extractNowPlaying({
        url: old_icecast_html_stats_url,
        headers: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "cache-control": "max-age=0",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1"
        },
        decodeJson: false,
        statsExtractor: (html_page) => {
            let regex = /<td>(?<param_data>[a-zA-Z\s]+):<\/td>\n<td class="streamdata">(?<value>.*)<\/td>/gm;
            let data: any = {};
            let m;
            while ((m = regex.exec(html_page)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }

                if (m?.groups?.param_data) {
                    data[m?.groups?.param_data] = m?.groups?.value
                }
            }

            const [firstPart, lastPart] = data["Current Song"]?.split(" - ") || ["", ""];
            let songName, artist;
            if (firstPart && lastPart) {
                artist = firstPart;
                songName = lastPart;
            } else {
                songName = firstPart;
                artist = "";
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song: {
                    name: songName?.trim(),
                    artist: artist?.trim()
                } || null,
                listeners: data["Current Listeners"] || null,
            };
        }
    });
}

const extractOldShoutcastHtmlNowPlaying = async ({old_shoutcast_stats_html_url}: { old_shoutcast_stats_html_url: string }): Promise<StationNowPlaying> => {
    return extractNowPlaying({
        url: old_shoutcast_stats_html_url,
        headers: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "cache-control": "max-age=0",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1"
        },
        decodeJson: false,
        statsExtractor: (html_page) => {
            let regex = /<tr><td width=100 nowrap><font class=default>(?<param_data>[a-zA-Z\s]+): <\/font><\/td><td><font class=default><b>(?<param_value>(.*?))<\/b><\/td><\/tr>/gmi;
            let data: any = {};
            let m;
            while ((m = regex.exec(html_page)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }

                if (m?.groups?.param_data) {
                    data[m?.groups?.param_data] = m?.groups?.value
                }
            }

            const [firstPart, lastPart] = /\((?<listeners>[0-9+]) unique\)/gmi.exec(data["Stream Status"])?.groups?.listeners?.split(" - ") || ["", ""];
            let songName, artist;
            if (firstPart && lastPart) {
                artist = firstPart;
                songName = lastPart;
            } else {
                songName = firstPart;
                artist = "";
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song: {
                    name: songName?.trim(),
                    artist: artist?.trim()
                } || null,
                listeners: data["Current Listeners"] || null,
            };
        }
    });
}

const getStationUptime = ({station}: { station: Station }): Promise<StationUptime> => {
    logger.info(`Checking uptime of station: `, station);
    let start = process.hrtime();
    let responseStatus = -1;
    let latency_ms = -1;
    let responseHeaders: any = {};

    const options: AxiosRequestConfig = {
        method: 'GET',
        url: station.stream_url,
        timeout: 5000,
        responseType: 'stream',
        headers: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "en-US,en;q=0.9,ro;q=0.8",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"97\", \"Chromium\";v=\"97\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Linux\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "cross-site",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1"
        }
    };

    return axios.request(options).then(async (response) => {
        responseStatus = response.status;
        responseHeaders = response.headers;

        // TODO: check if the audio volume is not 0 for at least 5-10 seconds

        latency_ms = Math.round(process.hrtime(start)[1] / 1000000);
        if (responseStatus !== 200) {
            return {
                timestamp: (new Date()).toISOString(),
                is_up: false,
                latency_ms,
                raw_data: {
                    responseHeaders,
                    responseStatus,
                }
            }
        }

        return {
            timestamp: (new Date()).toISOString(),
            is_up: true,
            latency_ms,
            raw_data: {
                responseHeaders,
                responseStatus,
            }
        }
    }).catch((error) => {
        logger.prettyError(error);
        return {
            timestamp: (new Date()).toISOString(),
            is_up: false,
            latency_ms: latency_ms,
            raw_data: {
                responseHeaders,
                responseStatus,
            }
        }
    })

}

const getStations = (): Promise<Station[]> => {
    const options: AxiosRequestConfig = {
        method: 'POST',
        url: PROJECT_ENV.APP_GRAPHQL_ENDPOINT_URI,
        headers: {
            'content-type': 'application/json',
            'x-hasura-admin-secret': PROJECT_ENV.APP_GRAPHQL_ADMIN_SECRET
        },
        data: {
            operationName: 'GetStations',
            query: `query GetStations {
  stations {
    id
    title
    stream_url
    station_metadata_fetches {
      station_metadata_fetch_category {
        slug
      }
      url
    }
  }
}`,
            variables: {}
        }
    };

    return axios.request(options).then(function (response) {
        if (!response.data?.data) {
            throw new Error(`Invalid response: ${JSON.stringify(response.data)}`);
        }

        return response.data.data.stations as Station[];

    });
}

const getStationNowPlaying = async ({station}: { station: Station }): Promise<StationNowPlaying> => {
    // TODO: in the future we might need to combine the output from multiple sources..

    for (let i = 0; i < station.station_metadata_fetches.length; i++) {
        const stationMetadataFetcher = station.station_metadata_fetches[i];
        if (stationMetadataFetcher.station_metadata_fetch_category.slug === "shoutcast") {
            return extractShoutcastNowPlaying({shoutcast_stats_url: stationMetadataFetcher.url});
        }

        if (stationMetadataFetcher.station_metadata_fetch_category.slug === "radio_co") {
            return extractRadioCoNowPlaying({radio_co_stats_url: stationMetadataFetcher.url});
        }

        if (stationMetadataFetcher.station_metadata_fetch_category.slug === "icecast") {
            return extractIcecastNowPlaying({icecast_stats_url: stationMetadataFetcher.url});
        }

        if (stationMetadataFetcher.station_metadata_fetch_category.slug === "shoutcast_xml") {
            return extractShoutcastXmlNowPlaying({shoutcast_xml_stats_url: stationMetadataFetcher.url});
        }

        if (stationMetadataFetcher.station_metadata_fetch_category.slug === "old_icecast_html") {
            return extractOldIcecastHtmlNowPlaying({old_icecast_html_stats_url: stationMetadataFetcher.url});
        }

        if (stationMetadataFetcher.station_metadata_fetch_category.slug === "old_shoutcast_html") {
            return extractOldShoutcastHtmlNowPlaying({old_shoutcast_stats_html_url: stationMetadataFetcher.url});
        }
    }

    return {
        timestamp: (new Date()).toISOString(),
        current_song: null,
        listeners: null,
        raw_data: {},
        error: null
    };
}

const updateStationMetadata = async ({
                                         station,
                                         stationNowPlaying,
                                         stationUptime
                                     }: { station: Station, stationNowPlaying: StationNowPlaying, stationUptime: StationUptime }): Promise<boolean> => {
    const escapedStationNowPlayingRawData = JSON.stringify(JSON.stringify(stationNowPlaying.raw_data));
    const escapedStationNowPlayingError = JSON.stringify(JSON.stringify(stationNowPlaying.error));
    const escapedStationUptimeRawData = JSON.stringify(JSON.stringify(stationUptime.raw_data));

    const options: AxiosRequestConfig = {
        method: 'POST',
        url: PROJECT_ENV.APP_GRAPHQL_ENDPOINT_URI,
        headers: {
            'content-type': 'application/json',
            'x-hasura-admin-secret': PROJECT_ENV.APP_GRAPHQL_ADMIN_SECRET
        },
        timeout: 5000,
        data: {
            operationName: 'UpdateStationMetadata',
            query: `mutation UpdateStationMetadata {
  insert_stations_now_playing_one(
    object: {
      station_id: ${station.id}
      timestamp: "${stationNowPlaying.timestamp}"
      song: { 
        data: { name: "${stationNowPlaying.current_song?.name}", artist: "${stationNowPlaying.current_song?.artist}" } 
        on_conflict: {
          constraint: song_name_artist_key
          update_columns: updated_at
        }
      }
      listeners: ${stationNowPlaying.listeners}
      raw_data: ${escapedStationNowPlayingRawData}
      error: ${escapedStationNowPlayingError}
    }
  ) {
    id
  }
  insert_stations_uptime_one(
    object: { 
        station_id: ${station.id}, 
        timestamp: "${stationUptime.timestamp}", 
        is_up: ${stationUptime.is_up}, 
        latency_ms: ${stationUptime.latency_ms}, 
        raw_data: ${escapedStationUptimeRawData} 
    }
  ) {
    id
  }
}
`,
            variables: {}
        }
    };

    return axios.request(options).then(function (response) {
        if (!response.data) {
            throw new Error(`Invalid response ${response.status}: ${JSON.stringify(response.data)}`);
        }
        if (response.data.errors) {
            throw new Error(`Invalid response ${response.status}: ${JSON.stringify(response.data)}`);
        }

        return typeof response.data?.data?.insert_stations_now_playing_one?.id !== "undefined" && typeof response.data?.data?.insert_stations_uptime_one?.id !== "undefined";

    });
}

export const refreshStationsMetadata = async () => {
    const stations: Station[] = await getStations();

    return BluebirdPromise.map(stations, async (station: Station) => {
            const stationNowPlaying: StationNowPlaying = await getStationNowPlaying({station});

            const stationUptime = await getStationUptime({station})

            // TODO: implement a mechanism to save in DB just the changes
            const done = await updateStationMetadata({station, stationNowPlaying, stationUptime})

            return {
                stationId: station.id,
                done: done
            };
        },
        {
            concurrency: 30,
        },
    );

}