import {HISTORY_DATA_DIRECTORY_PATH, Station, STATIONS, STATIONS_STATS_REFRESH_MS} from "../../../../constants";
import {Promise} from "bluebird";
import fs from "fs";
import path from "path";
import {STATION_STATS_BY_STATION_ID_CACHE} from "./index";

export interface Stats {
        timestamp: string
        current_song: string
        listeners: string | undefined
}
export interface StreamStatus {
    up: boolean
    latencyMs: number
    rawData: any
}
export interface StationStats {
    rawData: any
    stats: Stats
    error?: any | undefined
    streamStatus?: StreamStatus | undefined
}
export interface StationStatsByStationId { [key: number]: StationStats }

const updateStationStatsCache = async ({stations, station_stats_by_station_id}: {stations: Station[], station_stats_by_station_id: StationStatsByStationId}) => {
    console.log("stations: ", stations);
    console.log("station_stats_by_station_id: ", station_stats_by_station_id);
    const now = new Date();
    let today = now.toISOString().slice(0, 10);
    Object.assign(STATION_STATS_BY_STATION_ID_CACHE, station_stats_by_station_id);

    if (!fs.existsSync(HISTORY_DATA_DIRECTORY_PATH)){
        fs.mkdirSync(HISTORY_DATA_DIRECTORY_PATH);
    }

    await fs.writeFileSync(path.join(HISTORY_DATA_DIRECTORY_PATH, 'station_stats_by_station_id.json'), JSON.stringify({
        station_stats_by_station_id
    }));

    if (!fs.existsSync(path.join(HISTORY_DATA_DIRECTORY_PATH, today))){
        fs.mkdirSync(path.join(HISTORY_DATA_DIRECTORY_PATH, today));
    }
    await fs.writeFileSync(path.join(HISTORY_DATA_DIRECTORY_PATH, today, `${now.toISOString()}.json`), JSON.stringify({
        stations, station_stats_by_station_id
    }))
}

const extractStats = async ({url, headers, statsExtractor, decodeJson}: {url: string, headers?: any, statsExtractor: (data: any) => Stats, decodeJson: boolean}): Promise<StationStats> => {
    let rawData = undefined;
    return fetch(url, {
        headers: headers,
        body: null,
        method: "GET"
    })
        .then(response => {
            try {
                if(decodeJson) {
                    rawData = response.json();
                    return rawData;
                }
            } catch(e) {
                console.error("Invalid JSON response: ", response.text());
            }
            rawData = response.text();
            return rawData;
        })
        .then(async (data) => {
            return {
                rawData: data,
                stats: statsExtractor(data)
            }
        })
        .catch(error => {
            console.error(`Cannot extract stats from ${url}. error:`, error)
            return {
                rawData: {},
                stats: {
                    timestamp: (new Date()).toISOString(),
                    current_song: "",
                    listeners: undefined,
                },
                error: JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
            }
        });
}

const extractShoutcastStats = async ({shoutcast_stats_url}: {shoutcast_stats_url: string}): Promise<StationStats> => {
    return extractStats({
        url: shoutcast_stats_url,
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
        decodeJson: true,
        statsExtractor: (data) => {
            return {
                timestamp: (new Date()).toISOString(),
                current_song: data["songtitle"],
                listeners: data["currentlisteners"],
            };
        }
    });
}

const extractRadioCoStats = async ({radio_co_stats_url}: {radio_co_stats_url: string}): Promise<StationStats> => {
    return extractStats({
        url: radio_co_stats_url,
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
        decodeJson: true,
        statsExtractor: (data) => {
            return {
                timestamp: (new Date()).toISOString(),
                current_song: data["songtitle"],
                listeners: data["currentlisteners"],
            };
        }
    });
}

const extractIcecastStats = async ({icecast_stats_url}: {icecast_stats_url: string}): Promise<StationStats> => {
    return extractStats({
        url: icecast_stats_url,
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
        decodeJson: true,
        statsExtractor: (data) => {
            let listenurl = /listen_url=(?<listen_url>.+)/gmi.exec(icecast_stats_url)?.groups?.listen_url || "";
            let source = data["icestats"]["source"].find((source: any) => source.listenurl.includes(listenurl));
            return {
                timestamp: (new Date()).toISOString(),
                current_song: source["title"],
                listeners: source["listeners"],
            };
        }
    });
}

const extractShoutcastXmlStats = async ({shoutcast_xml_stats_url}: {shoutcast_xml_stats_url: string}): Promise<StationStats> => {
    return extractStats({
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

                if(m?.groups?.param_data) {
                    data[m?.groups?.param_data] = m?.groups?.value
                }
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song: data["SONGTITLE"] || "",
                listeners: data["CURRENTLISTENERS"] || undefined,
            };
        }
    });
}

const extractOldIcecastHtmlStats = async ({old_icecast_html_stats_url}: {old_icecast_html_stats_url: string}): Promise<StationStats> => {
    return extractStats({
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

                if(m?.groups?.param_data) {
                    data[m?.groups?.param_data] = m?.groups?.value
                }
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song: data["Current Song"] || "",
                listeners: data["Current Listeners"] || undefined,
            };
        }
    });
}

const extractOldShoutcastHtmlStats = async ({old_shoutcast_stats_html_url}: {old_shoutcast_stats_html_url: string}): Promise<StationStats> => {
    return extractStats({
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

                if(m?.groups?.param_data) {
                    data[m?.groups?.param_data] = m?.groups?.value
                }
            }
            return {
                timestamp: (new Date()).toISOString(),
                current_song:  /\((?<listeners>[0-9+]) unique\)/gmi.exec(data["Stream Status"])?.groups?.listeners || "",
                listeners: data["Current Listeners"] || undefined,
            };
        }
    });
}

const fetchWithTimeout = async function (url: string, options: any, timeout = 5000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeout)
        )
    ]);
}

const getStreamStatus = ({streamUrl}: {streamUrl:string}): Promise<StreamStatus> => {
    console.log(`Checking stream status: ${streamUrl}`);
    let start = process.hrtime();
    let responseStatus = -1;
    let latencyMs = -1;
    let headers: any = {};

    return fetchWithTimeout(streamUrl, {
        mode: 'no-cors',
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
    }, 10000).then(async (response) => {
        let s = streamUrl;
        responseStatus = response.status;
        latencyMs = Math.round(process.hrtime(start)[1]/ 1000000);
        headers = {};

        // @ts-ignore
        for(const header of response.headers.entries()){
            headers[header[0]] = header[1];
        }
        headers = JSON.parse(JSON.stringify(headers));

        if(responseStatus !== 200) {
            let textResponse = "";
            try {
                textResponse = await response.text();
            } catch(e){

            }
            return {up: false, latencyMs, rawData: {headers, responseStatus, textResponse}}
        }

        return {up: true, latencyMs, rawData: {headers, responseStatus}}            // RETURN DATA TRANSFERED AS BLOB
    }).catch((error) => {
        console.log(error);
        return {up: false, latencyMs: latencyMs, rawData: {headers, responseStatus}}
    })

}

export const refreshStationsStatsIfExpired = async () => {
    let shouldRefresh = false;
    if(Object.values(STATION_STATS_BY_STATION_ID_CACHE).length == 0) {
        shouldRefresh = true;
    }
    const now = new Date();
    Object.values(STATION_STATS_BY_STATION_ID_CACHE).forEach((s: StationStats) => {
        if(s?.stats?.timestamp) {
            // @ts-ignore
            const diffMilis = Math.abs(new Date(Date.parse(s.stats.timestamp)) - now);
            if(diffMilis > STATIONS_STATS_REFRESH_MS + 15000) {
                shouldRefresh = true;
            }
        } else {
            shouldRefresh = true;
        }
    })
    if(shouldRefresh) {
        await refreshStationsStats();
    }
}

export const refreshStationsStats = async () => {
    let station_stats_by_station_id: {[key: number]: StationStats} = {};

    await Promise.map(STATIONS, async (station: Station) => {
            if (typeof station.shoutcast_stats_url !== "undefined") {
                station_stats_by_station_id[station.id] = await extractShoutcastStats({shoutcast_stats_url: station.shoutcast_stats_url});
            }

            if (typeof station.radio_co_stats_url !== "undefined") {
                station_stats_by_station_id[station.id] = await extractRadioCoStats({radio_co_stats_url: station.radio_co_stats_url});
            }

            if (typeof station.icecast_stats_url !== "undefined") {
                station_stats_by_station_id[station.id] = await extractIcecastStats({icecast_stats_url: station.icecast_stats_url});
            }

            if (typeof station.shoutcast_xml_stats_url !== "undefined") {
                station_stats_by_station_id[station.id] = await extractShoutcastXmlStats({shoutcast_xml_stats_url: station.shoutcast_xml_stats_url});
            }

            if (typeof station.old_icecast_html_stats_url !== "undefined") {
                station_stats_by_station_id[station.id] = await extractOldIcecastHtmlStats({old_icecast_html_stats_url: station.old_icecast_html_stats_url});
            }

            if (typeof station.old_shoutcast_stats_html_url !== "undefined") {
                station_stats_by_station_id[station.id] = await extractOldShoutcastHtmlStats({old_shoutcast_stats_html_url: station.old_shoutcast_stats_html_url});
            }

            station_stats_by_station_id[station.id] = {
                ...station_stats_by_station_id[station.id],
                streamStatus : await getStreamStatus({streamUrl: station.stream_url})
            }
        },
        {
            concurrency: 30,
        },
    );

    await Promise.map(STATIONS, async (station: Station) => {
            station_stats_by_station_id[station.id] = {
                ...station_stats_by_station_id[station.id],
                streamStatus : await getStreamStatus({streamUrl: station.stream_url})
            }
        },
        {
            concurrency: 5,
        },
    );

    await updateStationStatsCache({stations: STATIONS, station_stats_by_station_id});

    return station_stats_by_station_id;

}

export default async function handler(req: any, res: any) {
    let station_stats_by_station_id = await refreshStationsStats();
    let result = Object.entries(station_stats_by_station_id).map((v, k) => {
        return {
            station: STATIONS[k],
            stats: v
        }
    })
    res.status(200).json({ result: result, done: true })
}