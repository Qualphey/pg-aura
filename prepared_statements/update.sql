PREPARE {{ prepared_statement }}(
  {%- for arg_type in arg_types %}
    {%- if loop.last -%}
      {{ arg_type }}
    {%- else -%}
      {{ arg_type }},
    {%- endif %}
  {%- endfor -%}
) AS
  UPDATE {{ table }} SET {{""}}
  {%- for col in columns %}
    {%- if loop.last -%}
      {{ col.name }} = ${{ col.index }}
    {%- else -%}
      {{ col.name }} = ${{ col.index }}, {{""}}
    {%- endif %}
  {%- endfor %} WHERE {{ condition }};
