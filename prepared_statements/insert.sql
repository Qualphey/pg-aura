PREPARE {{table}}_insert_cols_
{%- for col in columns %}
  {%- if loop.last %}
    {{- col.name -}}
  {% else %}
    {{- col.name}}_
  {%- endif %}
{%- endfor -%}
(
  {%- for col in columns %}
    {%- if loop.last %}
      {{- col.type -}}
    {% else %}
      {{- col.type}},
    {%- endif %}
  {%- endfor -%}
) AS
  INSERT INTO {{table}}(
    {%- for col in columns %}
      {%- if loop.last %}
        {{- col.name -}}
      {% else %}
        {{- col.name -}},
      {%- endif %}
    {%- endfor -%}
  )
  VALUES(
    {%- for col in columns %}
      {%- if loop.last -%}
        ${{loop.index -}}
      {% else -%}
        ${{loop.index}},
      {%- endif %}
    {%- endfor -%}
  ) RETURNING ID;
