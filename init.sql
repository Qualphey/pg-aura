 /* DROP TABLE IF EXISTS {{table}}; DEBUG ONLY !! */

CREATE TABLE IF NOT EXISTS {{table}} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(){% for col in columns %},
  {{col.name}} {{col.type}}{% endfor %},
  data JSONB
);
