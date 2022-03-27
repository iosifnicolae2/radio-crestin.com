from django.contrib import admin
from import_export.admin import ImportExportModelAdmin

from .models import Songs, StationGroups, StationMetadataFetchCategories, StationToStationGroup, Stations, \
    StationsMetadataFetch, StationsNowPlaying, StationsUptime


class StationGroupsInline(admin.TabularInline):
    model = Stations.groups.through
    extra = 0
    show_change_link = True
    readonly_fields = ['created_at', 'updated_at', ]


class StationsMetadataFetchInline(admin.TabularInline):
    model = StationsMetadataFetch
    extra = 0
    show_change_link = True
    readonly_fields = ['created_at', 'updated_at', ]


@admin.register(Stations)
class StationsAdmin(ImportExportModelAdmin):
    search_fields = ['title', 'website', 'email', 'stream_url']
    # list_filter = ('station', 'group')
    list_display = ('title',)
    readonly_fields = ('created_at', 'updated_at', 'latest_station_uptime', 'latest_station_now_playing',)
    inlines = [
        StationGroupsInline,
        StationsMetadataFetchInline,
    ]


@admin.register(StationGroups)
class StationGroupsAdmin(ImportExportModelAdmin):
    search_fields = ['name', ]
    list_display = ('name',)
    readonly_fields = ('created_at', 'updated_at',)


@admin.register(StationMetadataFetchCategories)
class StationMetadataFetchCategoriesAdmin(ImportExportModelAdmin):
    search_fields = ['slug', ]
    list_display = ('slug',)
    readonly_fields = ('created_at', 'updated_at',)


@admin.register(StationToStationGroup)
class StationToStationGroupAdmin(ImportExportModelAdmin):
    search_fields = ['station', 'group']
    list_filter = ('station', 'group')
    list_display = ('station', 'group')
    readonly_fields = ('created_at', 'updated_at',)


@admin.register(StationsMetadataFetch)
class StationsMetadataFetchAdmin(ImportExportModelAdmin):
    search_fields = ['station', 'station_metadata_fetch_category']
    list_filter = ('station', 'station_metadata_fetch_category',)
    list_display = ('station', 'station_metadata_fetch_category',)
    readonly_fields = ('created_at', 'updated_at',)


@admin.register(StationsNowPlaying)
class StationsNowPlayingAdmin(ImportExportModelAdmin):
    search_fields = ['station', 'song', 'raw_data', 'error']
    list_filter = ('timestamp', 'station', 'song',)
    list_display = ('timestamp', 'station', 'song', 'listeners',)
    readonly_fields = ('created_at', 'updated_at',)


@admin.register(StationsUptime)
class StationsUptimeAdmin(ImportExportModelAdmin):
    search_fields = ['station', 'song', 'raw_data', 'error']
    list_filter = ('timestamp', 'station', 'is_up',)
    list_display = ('timestamp', 'station', 'is_up',)
    readonly_fields = ('created_at', 'updated_at',)


@admin.register(Songs)
class SongsAdmin(ImportExportModelAdmin):
    search_fields = ['name', 'artist']
    list_display = ('name', 'artist')
    list_filter = ('artist',)
    readonly_fields = ('created_at', 'updated_at',)