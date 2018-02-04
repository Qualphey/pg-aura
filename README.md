# pg-aura
Simplified PostgreSQL client built using [node-postgres](https://github.com/brianc/node-postgres)

The main purpose of this library is to provide ease of use and to protect your database from SQL injections.

```
  npm install pg-aura
```

## Usage
```javascript
(async function() {
  var aura = await require('pg-aura').connect({
    db_host: "127.0.0.1",
    db_super_usr: "postgres",
    db_super_pwd: "POSTGRES_PASSWORD",
    db_name: "DATABASE_NAME"
  });

  var table = await aura.table('table_name', {
    columns: {
      name: 'varchar(256)',
      last_name: 'varchar(256)',
      float: 'float(8)',
      big_int: 'BIGINT',
      text_array: 'text[]'
    }
  });

  // ...

})()
```

## Table API
  ### table.insert( {obj} );
    Insert by passing an argument object with at least one value named same as one column from the table.

    ```javascript
      const id = await table.insert({
        name: "Aura",
        big_int: 987654321,
        text_array: ["One", "Two", "Three"]
      });
    ```
    
  ### table.select("columns"[], "where", values[mixed])
    Select rows from a table.
    Arguments:
      columns: "string" || array["string"] i.e. "\*" || ["column_name"],
      where: "string" i.e. "column_a = $1 OR column_b = $2",
      values: array[mixed] i.e. ["One", 2] these values will represent parameters ($1, $2) used in where condition

    ```javascript
      var auras = await table.select(
        ['name', 'float', 'big_int', 'text_array'],
        "name = $1",
        ["Aura"]
      );

      // OR

      var auras = await table.select(
        '*', "name = $1", ["Aura"]
      );

      // OR

      var auras = table.select('*');
    ```
    ### table.update(set{obj}, "where", values[mixed])
      Update rows within a table.
      Arguments:
        set: {obj}  i.e. { column_name: "new value" },
        where: "string" i.e. "column_a = $1 OR column_b = $2",
        values: array[mixed] i.e. ["One", 2] these values will represent parameters ($1, $2) used in where condition

      ```javascript
        await table.update(
          { name: "NEW NAME", float: 4.842 },
          "name = $1",
          ["Aura"]
        );
      ```
    ### table.delete("where", values[mixed])
      Delete rows within a table.
      Arguments:
        where: "string" i.e. "column_a = $1 OR column_b = $2",
        values: array[mixed] i.e. ["One", 2] these values will represent parameters ($1, $2) used in where condition

      ```javascript
        await table.delete(
          "name = $1",
          ["Aura"]
        );
    ```
