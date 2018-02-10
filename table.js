
var nunjucks = require('nunjucks');
var nunjucks_env = new nunjucks.Environment(new nunjucks.FileSystemLoader(__dirname+'/prepared_statements', {
  autoescape: true,
  noCache: true
}));

var fs = require('fs');

module.exports = class {
  constructor(name, context, client, nunjucks) {
    this.name = name;
    this.columns = [];
    for (var key in context.columns) {
      this.columns.push({ name: key, type: context.columns[key]});
    }
    context.columns = this.columns;
    context.table = name;
    this.sql = nunjucks.render('init.sql', context);

    this.columns.push({ name: 'id', type: 'uuid'});

    context.table = name;
    this.client = client;

    this.conditions = [];
    this.prepared_statements = {
      insert: [],
      select: [],
      update: [],
      delete: []
    };
  }

  async init() {
    try {
      console.log("INITIALISING", this.name, "TABLE");
      console.log(this.sql);
      await this.client.query(this.sql);
    } catch (e) {
      console.log(e);
    }
  }

  async insert(obj) {
    try {
      var prepared_statement = this.name+'_insert_cols';
      var columns = this.get_columns(obj);
      var values = [];
      console.log("COLUMNS", columns);
      for (var c = 0; c < columns.length; c++) {
        prepared_statement += '_'+columns[c].name;
          if (obj[columns[c].name]) {
            values.push(obj[columns[c].name]);
          }
      }

      if (!this.prepared_statements.insert.includes(prepared_statement)) {
        var prep_sql = nunjucks_env.render('insert.sql', {
          table: this.name,
          columns: columns
        });
        console.log(prep_sql);
        await this.client.query(prep_sql);
        this.prepared_statements.insert.push(prepared_statement);
      }

      var arg_str = this.prepare_arg_string(values);
      console.log("ARG STR", arg_str);
      var qstr = "EXECUTE "+prepared_statement+arg_str;
      console.log(qstr);
      return (await this.client.query(qstr)).rows[0].id;
    } catch (e) {
      console.error(e.stack);
      return false;
    }
  }

  async select(what, where, values) {
    try {
      var prepared_statement = this.name+'_select_cols';
      var columns = this.get_columns(what);
      if (what != "*") {
        for (var c = 0; c < columns.length; c++) {
          prepared_statement += '_'+columns[c].name;
        }
      }

      var condition_sql = false;
      var arg_types = false;
      if (where) {
        where = where.replace(/\s\s+/g, ' ');
        where = where.replace('( ', '(');
        where = where.replace(' )', ')');
        var condition = this.prepare_condition(where);
        condition_sql = condition.sql;
        console.log("WHERE", condition.id);

        prepared_statement += '_where_'+condition.id;

        arg_types = this.parse_conditions(where);
        console.log("arg_types", arg_types);

        if (!this.prepared_statements.select.includes(prepared_statement)) {
          var select_cfg = {
            table: this.name,
            columns: columns,
            prepared_statement: prepared_statement,
            arg_types: arg_types,
            condition: condition_sql
          };
          console.log("SELECT CFG", select_cfg);

          var prep_sql = nunjucks_env.render('select.sql', select_cfg);
          console.log(prep_sql);
          await this.client.query(prep_sql);
          this.prepared_statements.select.push(prepared_statement);
        }

        var argument_string = this.prepare_arg_string(values);

        var qstr = "EXECUTE "+prepared_statement+argument_string;
        console.log(qstr);
        return (await this.client.query(qstr)).rows;
      } else {
        var qstr = "SELECT ";
        console.log("WHAT:", what);
        console.log("qstr:", qstr);
        if (what === '*') {
          qstr += '*';
        } else {
          if (columns.length > 0) {
            qstr += columns[0].name;
            for (var c = 1; c < columns.length; c++) {
              qstr += ', '+columns[c].name;
            }
          }
        }
        qstr += ' FROM '+this.name;

        console.log(qstr);
        return (await this.client.query(qstr)).rows;
      }
    } catch (e) {
      console.error(e.stack);
      return false;
    }
  }

  async update(set, where, values) {
    try {
      var prepared_statement = this.name+'_update_cols_';
      var set_param_types = [];

      var columns = this.get_columns(set);
      for (var c = 0; c < columns.length; c++) {
        if (values) {
          columns[c].index = values.length+c+1;
        } else {
          columns[c].index = c+1;
        }
        prepared_statement += columns[c].name+'_';
        set_param_types.push(columns[c].type);
      }

      var condition = false;
      var arg_types = false;
      if (where) {
        where = where.replace(/\s\s+/g, ' ');
        where = where.replace('( ', '(');
        where = where.replace(' )', ')');
        condition = this.prepare_condition(where);
        prepared_statement += 'where_'+condition.id;
        arg_types = this.parse_conditions(where);
        arg_types.push.apply(arg_types, set_param_types);
      }

      if (values) {
        values.push.apply(values, this.prepare_arg_values(set));
      } else {
        values = this.prepare_arg_values(set);
      }

      if (!this.prepared_statements.update.includes(prepared_statement)) {
        var prep_sql = nunjucks_env.render('update.sql', {
          table: this.name,
          columns: columns,
          prepared_statement: prepared_statement,
          arg_types: arg_types,
          condition: condition.sql
        });
        console.log(prep_sql);
        await this.client.query(prep_sql);
        this.prepared_statements.update.push(prepared_statement);
      }

      var argument_string = this.prepare_arg_string(values);

      var qstr = "EXECUTE "+prepared_statement+argument_string;
      console.log(qstr);
      console.log("HERE");
      return (await this.client.query(qstr)).rows;
    } catch (e) {
      console.error(e.stack);
      return false;
    }
  }

  async delete(where, values) {
    try {
      var prepared_statement = this.name+'_delete_where_';

      where = where.replace(/\s\s+/g, ' ');
      where = where.replace('( ', '(');
      where = where.replace(' )', ')');

      var condition = this.prepare_condition(where);
      prepared_statement += condition.id;

      var arg_types = this.parse_conditions(where);

      if (!this.prepared_statements.delete.includes(prepared_statement)) {
        var prep_sql = nunjucks_env.render('delete.sql', {
          table: this.name,
          prepared_statement: prepared_statement,
          arg_types: arg_types,
          condition: condition.sql
        });
        console.log(prep_sql);
        await this.client.query(prep_sql);
        this.prepared_statements.delete.push(prepared_statement);
      }

      var argument_string = this.prepare_arg_string(values);

      var qstr = "EXECUTE "+prepared_statement+argument_string;
      console.log(qstr);
      return (await this.client.query(qstr)).rows;
    } catch (e) {
      console.error(e.stack);
      return false;
    }
  }

  get_columns(opt) {
    if (Array.isArray(opt)) {
      var columns = [];
      for (var c = 0; c < this.columns.length; c++) {
        var col_name = this.columns[c].name;
        var defined = false;
        for (var o = 0; o < opt.length; o++) {
          if (col_name == opt[o]) {
            defined = true;
          }
        }
        if (defined) {
          columns.push(this.columns[c]);
        }
      }
      return columns;
    } else if (opt && typeof opt === 'object' && opt.constructor === Object) {
      var columns = [];
      for (var c = 0; c < this.columns.length; c++) {
        var col_name = this.columns[c].name;
        var col_type = this.columns[c].type;
        var defined = false;
        for (var key in opt) {
          if (col_name == key) {
            defined = true;
          }
        }
        if (defined) {
          columns.push(this.columns[c]);
        }
      }
      return columns;
    } else {
      return this.columns;
    }
  }

  prepare_condition(sql) {
    for (var c = 0; c < this.conditions.length; c++) {
      if (this.conditions[c].sql == sql) {
        return this.conditions[c];
      }
    }
    var new_condition = { id: this.conditions.length, sql: sql };
    this.conditions.push(new_condition);
    return new_condition;
  }

  prepare_arg_types(values) {
    var arg_types = [];

    for (var c = 0; c < this.columns.length; c++) {
      var col_name = this.columns[c].name;
      var col_type = this.columns[c].type;
      for (var v = 0; v < values.length; v++) {
        if (col_name == values[v]) {
          arg_types.push(col_type);
          break;
        }
      }
    }
    return arg_types;
  }

  prepare_arg_values(values) {
    var arg_values = [];

    for (var c = 0; c < this.columns.length; c++) {
      var col_name = this.columns[c].name;
      var col_type = this.columns[c].type;
      for (var key in values) {
        if (col_name == key) {
          arg_values.push(values[key]);
          break;
        }
      }
    }
    return arg_values;
  }

  prepare_arg_string(values) {
    console.log("PREPARE ARG STRING", values);
    if (values) {
      var string = '(';
      var first_value = true;
      for (var v = 0; v < values.length; v++) {
        var value = values[v];
        if (!first_value) {
          string += ', ';
        } else {
          first_value = false;
        }

        if (typeof value === 'string' || value instanceof String) {
          string += "'"+value+"'";
        } else if (typeof value === 'array' || value instanceof Array) {
          string += "ARRAY [";
          for (var va = 0; va < value.length; va++) {
            if (va > 0) {
              string += ", '"+value[va]+"'";
            } else {
              string += "'"+value[va]+"'";
            }
          }
          string += "]";
        } else {
          string += value;
        }
      }
      string += ')';
      return string;
    } else {
      return '';
    }
  }

  parse_conditions(str) {
  console.log(str);
    var result = [];
    function set_param_column(param, column) {
      param = parseInt(parameter.replace('$', ''));
      var param_exists = false;
      for (var r = 0; r < result.length; r++) {
        if (result[r].param === param) {
          result[r].columns.push(column);
          param_exists = true;
          break;
        }
      }
      if (!param_exists) {
        result[r] = {
          param: param,
          columns: [column]
        }
      }
    };

    var regex = /((\w*) *(?:ALL|IN|<=|>=|!=|<>|@>|<@|&&|\|\||<|>|=) *(\$\d*|\w*\s?\(\$\d*\)))/g;
    var match;
    console.log("REGEX",regex.exec(""));
    while (match = regex.exec(str)) {
      var column = match [2];
      console.log(column);
      var parameter = match[3];
      set_param_column(parameter, column);
    }

    result.sort(function(a, b) {
      if (a.param < b.param) {
        return -1;
      } else if (a.param > b.param) {
        return 1;
      } else {
        return 0;
      }
    });

    var types = [];
    for (var r = 0; r < result.length; r++) {
      for (var c = 0; c < this.columns.length; c++) {
        var col_name = this.columns[c].name;
        var col_type = this.columns[c].type;
        if (col_name == result[r].columns[0]) {
          types.push(col_type);
        }
      }
    }

    return types;
  }
}
