import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { lucia } from '../lib/auth.js';

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef: string | null;
  isUnique: boolean;
}

interface TableInfo {
  name: string;
  schema: string;
  columns: TableColumn[];
  rowCount: number | null;
}

interface ForeignKeyInfo {
  constraintName: string;
  tableName: string;
  columnName: string;
  foreignTableName: string;
  foreignColumnName: string;
}

export const databaseRoutes: FastifyPluginAsync = async (app) => {
  // Auth hook
  app.addHook('preHandler', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    (request as any).user = user;
  });

  // Get database schema introspection
  app.get('/schema', async (request, reply) => {
    try {
      // Get all tables from PostgreSQL information_schema
      const tables = await prisma.$queryRaw<Array<{ table_name: string; table_schema: string }>>`
        SELECT table_name, table_schema
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      // Get all columns with their details
      const columns = await prisma.$queryRaw<Array<{
        table_name: string;
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
        character_maximum_length: number | null;
      }>>`
        SELECT
          table_name,
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;

      // Get primary keys
      const primaryKeys = await prisma.$queryRaw<Array<{
        table_name: string;
        column_name: string;
      }>>`
        SELECT
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      `;

      // Get foreign keys
      const foreignKeys = await prisma.$queryRaw<ForeignKeyInfo[]>`
        SELECT
          tc.constraint_name as "constraintName",
          tc.table_name as "tableName",
          kcu.column_name as "columnName",
          ccu.table_name as "foreignTableName",
          ccu.column_name as "foreignColumnName"
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      `;

      // Get unique constraints
      const uniqueConstraints = await prisma.$queryRaw<Array<{
        table_name: string;
        column_name: string;
      }>>`
        SELECT
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = 'public'
      `;

      // Build primary key lookup
      const pkLookup = new Set(
        primaryKeys.map(pk => `${pk.table_name}.${pk.column_name}`)
      );

      // Build foreign key lookup
      const fkLookup = new Map<string, string>();
      foreignKeys.forEach(fk => {
        fkLookup.set(
          `${fk.tableName}.${fk.columnName}`,
          `${fk.foreignTableName}(${fk.foreignColumnName})`
        );
      });

      // Build unique constraint lookup
      const uniqueLookup = new Set(
        uniqueConstraints.map(uc => `${uc.table_name}.${uc.column_name}`)
      );

      // Build table info with columns
      const tableMap = new Map<string, TableInfo>();

      tables.forEach(table => {
        tableMap.set(table.table_name, {
          name: table.table_name,
          schema: table.table_schema,
          columns: [],
          rowCount: null,
        });
      });

      columns.forEach(col => {
        const table = tableMap.get(col.table_name);
        if (table) {
          const key = `${col.table_name}.${col.column_name}`;

          // Format the data type nicely
          let dataType = col.data_type.toUpperCase();
          if (col.character_maximum_length) {
            dataType = `${col.udt_name.toUpperCase()}(${col.character_maximum_length})`;
          } else if (col.udt_name === 'uuid') {
            dataType = 'UUID';
          } else if (col.udt_name === 'timestamptz') {
            dataType = 'TIMESTAMP';
          } else if (col.udt_name === 'int4') {
            dataType = 'INTEGER';
          } else if (col.udt_name === 'int8') {
            dataType = 'BIGINT';
          } else if (col.udt_name === 'bool') {
            dataType = 'BOOLEAN';
          } else if (col.udt_name === 'jsonb') {
            dataType = 'JSONB';
          } else if (col.udt_name === '_text') {
            dataType = 'TEXT[]';
          } else if (col.udt_name === '_int4') {
            dataType = 'INTEGER[]';
          } else if (col.udt_name === '_varchar') {
            dataType = 'VARCHAR[]';
          } else if (col.udt_name.startsWith('_')) {
            dataType = `${col.udt_name.substring(1).toUpperCase()}[]`;
          }

          table.columns.push({
            name: col.column_name,
            type: dataType,
            nullable: col.is_nullable === 'YES',
            defaultValue: col.column_default,
            isPrimaryKey: pkLookup.has(key),
            isForeignKey: fkLookup.has(key),
            foreignKeyRef: fkLookup.get(key) || null,
            isUnique: uniqueLookup.has(key) || pkLookup.has(key),
          });
        }
      });

      const result = Array.from(tableMap.values());

      return reply.send({
        tables: result,
        foreignKeys: foreignKeys,
        stats: {
          tableCount: result.length,
          totalColumns: columns.length,
          foreignKeyCount: foreignKeys.length,
        },
      });
    } catch (error) {
      console.error('[Database] Schema introspection failed:', error);
      return reply.status(500).send({
        error: 'Failed to introspect database schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get row counts for tables (separate endpoint as it can be slow)
  app.get('/stats', async (request, reply) => {
    try {
      // Get approximate row counts from PostgreSQL statistics
      const stats = await prisma.$queryRaw<Array<{
        table_name: string;
        row_count: number;
      }>>`
        SELECT
          relname as table_name,
          n_live_tup as row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
      `;

      return reply.send({ stats });
    } catch (error) {
      console.error('[Database] Stats fetch failed:', error);
      return reply.status(500).send({
        error: 'Failed to fetch database stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get indexes for a specific table
  app.get('/indexes/:tableName', async (request, reply) => {
    const { tableName } = request.params as { tableName: string };

    try {
      const indexes = await prisma.$queryRaw<Array<{
        index_name: string;
        column_name: string;
        is_unique: boolean;
        is_primary: boolean;
      }>>`
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indisprimary as is_primary
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = ${tableName}
          AND t.relkind = 'r'
        ORDER BY i.relname, a.attnum
      `;

      return reply.send({ indexes });
    } catch (error) {
      console.error('[Database] Index fetch failed:', error);
      return reply.status(500).send({
        error: 'Failed to fetch indexes',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Convert introspected schema to DB Builder format
  app.get('/schema/builder-format', async (request, reply) => {
    try {
      // Reuse the schema introspection logic
      const tables = await prisma.$queryRaw<Array<{ table_name: string; table_schema: string }>>`
        SELECT table_name, table_schema
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const columns = await prisma.$queryRaw<Array<{
        table_name: string;
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
        column_default: string | null;
        character_maximum_length: number | null;
      }>>`
        SELECT
          table_name,
          column_name,
          data_type,
          udt_name,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;

      const primaryKeys = await prisma.$queryRaw<Array<{
        table_name: string;
        column_name: string;
      }>>`
        SELECT
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      `;

      const foreignKeys = await prisma.$queryRaw<ForeignKeyInfo[]>`
        SELECT
          tc.constraint_name as "constraintName",
          tc.table_name as "tableName",
          kcu.column_name as "columnName",
          ccu.table_name as "foreignTableName",
          ccu.column_name as "foreignColumnName"
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      `;

      const uniqueConstraints = await prisma.$queryRaw<Array<{
        table_name: string;
        column_name: string;
      }>>`
        SELECT
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = 'public'
      `;

      // Build lookups
      const pkLookup = new Set(primaryKeys.map(pk => `${pk.table_name}.${pk.column_name}`));
      const fkLookup = new Map<string, string>();
      foreignKeys.forEach(fk => {
        fkLookup.set(`${fk.tableName}.${fk.columnName}`, `${fk.foreignTableName}(${fk.foreignColumnName})`);
      });
      const uniqueLookup = new Set(uniqueConstraints.map(uc => `${uc.table_name}.${uc.column_name}`));

      // Convert to DB Builder format
      const builderTables = tables.map(table => {
        const tableColumns = columns.filter(c => c.table_name === table.table_name);

        return {
          id: table.table_name, // Use table name as ID
          name: table.table_name,
          fields: tableColumns.map(col => {
            const key = `${col.table_name}.${col.column_name}`;

            // Format type
            let dataType = col.data_type.toUpperCase();
            if (col.character_maximum_length) {
              dataType = `VARCHAR(${col.character_maximum_length})`;
            } else if (col.udt_name === 'uuid') {
              dataType = 'UUID';
            } else if (col.udt_name === 'timestamptz') {
              dataType = 'TIMESTAMP';
            } else if (col.udt_name === 'int4') {
              dataType = 'INTEGER';
            } else if (col.udt_name === 'int8') {
              dataType = 'BIGINT';
            } else if (col.udt_name === 'bool') {
              dataType = 'BOOLEAN';
            } else if (col.udt_name === 'jsonb') {
              dataType = 'JSONB';
            } else if (col.udt_name === 'text') {
              dataType = 'TEXT';
            } else if (col.udt_name === '_text') {
              dataType = 'TEXT[]';
            } else if (col.udt_name === '_int4') {
              dataType = 'INTEGER[]';
            } else if (col.udt_name.startsWith('_')) {
              dataType = `${col.udt_name.substring(1).toUpperCase()}[]`;
            }

            return {
              name: col.column_name,
              type: dataType,
              pk: pkLookup.has(key),
              fk: fkLookup.get(key) || undefined,
              unique: uniqueLookup.has(key),
              nullable: col.is_nullable === 'YES',
            };
          }),
        };
      });

      return reply.send({ tables: builderTables });
    } catch (error) {
      console.error('[Database] Builder format conversion failed:', error);
      return reply.status(500).send({
        error: 'Failed to convert schema to builder format',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};
