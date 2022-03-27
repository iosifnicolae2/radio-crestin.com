-- Could not auto-generate a down migration.
-- Please write an appropriate down migration for the SQL below:
-- DROP TRIGGER IF EXISTS update_station_latest_station_now_playing_id_field ON public.station_now_playing;
--
-- CREATE TRIGGER update_station_latest_station_now_playing_id_field
--     AFTER INSERT
--     ON public.station_now_playing
--     FOR EACH ROW
--     EXECUTE FUNCTION public.update_station_latest_station_now_playing_id_field();
--
--
-- DROP TRIGGER IF EXISTS update_station_latest_station_uptime_id_field ON public.station_uptime;
--
--
-- CREATE TRIGGER update_station_latest_station_uptime_id_field
--     AFTER INSERT
--     ON public.station_uptime
--     FOR EACH ROW
--     EXECUTE FUNCTION public.update_station_latest_station_uptime_id_field();