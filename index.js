'use strict'

const fs = require("fs");
const path = require("path");

const PostgreSQL = require('pg');
const { Pool, Client } = PostgreSQL;

var Table = require('./table.js');

var nunjucks = require('nunjucks');
var nunjucks_env = new nunjucks.Environment(new nunjucks.FileSystemLoader(__dirname, {
  autoescape: true,
  noCache: true
}));

module.exports = class {
  constructor() {
  }

  static async connect(cfg) {
    try {
      var init_client = new Client({
        user: cfg.db_super_usr,
        password: cfg.db_super_pwd,
        host: cfg.db_host,
        database: 'postgres',
        port: 5432
      });
      await init_client.connect();

      init_client.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err)
        process.exit(-1)
      })

      var exists = await init_client.query("SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower('"+cfg.db_name+"')");

      if (exists.rowCount == 0) {
        await init_client.query("CREATE DATABASE "+cfg.db_name+";");
        await init_client.query("REVOKE connect ON DATABASE "+cfg.db_name+" FROM PUBLIC;");
        await init_client.query("CREATE USER "+cfg.db_name+" WITH PASSWORD '"+cfg.db_super_pwd+"';");
        await init_client.query("GRANT ALL PRIVILEGES ON DATABASE "+cfg.db_name+" to "+cfg.db_name+";");
      }

      init_client.end().catch(err => console.error('error during disconnection', err.stack))


      init_client = new Client({
        user: cfg.db_super_usr,
        password: cfg.db_super_pwd,
        host: cfg.db_host,
        database: cfg.db_name,
        port: 5432
      });
      init_client.connect();

      init_client.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err)
        process.exit(-1)
      });

      await init_client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

      init_client.end().catch(err => console.error('error during disconnection', err.stack))

//+-+-+-+-+-+-+-+-+-+-+-+-+-

      console.log("CONNECTING TO DB", cfg.db_name);

      const pool = new Pool({
        user: cfg.db_name,
        password: cfg.db_super_pwd,
        host: cfg.db_host,
        database: cfg.db_name,
        port: 5432
      });

      pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err)
        process.exit(-1)
      });

      var this_class = new module.exports();
      this_class.client = await pool.connect();
      this_class.db_name = cfg.db_name;

      return this_class;
    } catch (e) {
      console.error(e.stack);
      process.exit(-1);
    }
  }

  async table(name, context) {
    try {
      var new_table = new Table(name, context, this.client, nunjucks_env);
      await new_table.init();
      return new_table;
    } catch (e) {
      console.error(e);
    }
  }

  async query(str) {
    return this.client.query(str);
  }
}
