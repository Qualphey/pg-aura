PREPARE {{ prepared_statement }}(
  {%- for arg_type in arg_types %}
    {%- if loop.last %}
      {{- arg_type -}}
    {% else %}
      {{- arg_type}},
    {%- endif %}
  {%- endfor -%}
) AS
  DELETE FROM {{table}} WHERE {{ condition }};
