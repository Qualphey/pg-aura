PREPARE {{ prepared_statement }} {% if arg_types %}(
  {%- for arg_type in arg_types %}
    {%- if loop.last %}
      {{- arg_type -}}
    {% else %}
      {{- arg_type}},
    {%- endif %}
  {%- endfor -%}
){% endif %} AS
  SELECT {% for col in columns %}
    {%- if loop.last %}
      {{- col.name -}}
    {% else %}
      {{- col.name -}}, {{""}}
    {%- endif %}
  {%- endfor %} FROM {{table}} {%- if condition %} WHERE {{ condition | safe}} {% endif %};
