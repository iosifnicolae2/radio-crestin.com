CREATE TABLE "public"."reviews" ("id" serial NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "station_id" integer NOT NULL, "stars" integer NOT NULL, "message" text NOT NULL, "verified" boolean NOT NULL DEFAULT false, "user_id" integer NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON UPDATE cascade ON DELETE cascade, UNIQUE ("station_id", "user_id"));
CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_public_reviews_updated_at"
BEFORE UPDATE ON "public"."reviews"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_reviews_updated_at" ON "public"."reviews" 
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
