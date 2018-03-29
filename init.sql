 /* DROP TABLE IF EXISTS {{table}}; DEBUG ONLY !! */


CREATE TABLE IF NOT EXISTS {{table}} (
  {% for col in columns -%}
    {{col.name}} {{col.type}} {% if col.default %}{{col.default}}{% endif %}
    {%- if not loop.last -%}
      ,
    {%- endif %}
  {% endfor %}
);

{% if (alter_columns|length) or (add_columns|length) or (drop_columns|length) %}
  ALTER TABLE IF EXISTS {{table}}
    {% for alt in alter_columns -%}
    /*  ALTER COLUMN {{alt.name}} TYPE {{alt.type}}*/
      DROP COLUMN {{alt.name}},
      ADD COLUMN {{alt.name}} {{alt.type}} {% if col.default %}{{col.default}}{% endif %}
      {%- if not loop.last -%}
        ,
      {%- elif (add_columns|length) or (drop_columns|length) -%}
        ,
      {%- endif %}
    {% endfor %}
    {%- for alt in add_columns -%}
      ADD COLUMN {{alt.name}} {{alt.type}} {% if col.default %}{{col.default}}{% endif %}
      {%- if not loop.last -%}
        ,
      {%- elif drop_columns|length -%}
        ,
      {%- endif %}
    {% endfor %}
    {%- for alt in drop_columns -%}
      DROP COLUMN {{alt.name}}
      {%- if not loop.last -%}
        ,
      {%- endif %}
    {% endfor %}
{%- endif %}
