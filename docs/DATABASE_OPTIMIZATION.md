# Database Connection Pooling Configuration

For optimal horizontal scaling, configure your database connection pool in your environment variables:

## Example .env file configuration

```env
# Database URL with connection pooling
DATABASE_URL="postgresql://user:password@localhost:5432/pagarbook?schema=public&connection_limit=20&pool_timeout=30"

# For Vercel/Neon serverless
DATABASE_URL="postgresql://user:password@ep-xyz.us-east-1.aws.neon.tech/pagarbook?pool=true&connection_limit=10"

# For Railway/Render
DATABASE_URL="postgresql://user:password@localhost:5432/pagarbook?sslmode=require&connection_limit=25"
```

## Connection Pool Best Practices

1. **Serverless environments** (Vercel, Netlify):
   - Use connection_limit=10 (avoid exhausting connections)
   - Use pool_timeout=10

2. **Traditional servers** (DigitalOcean, AWS EC2):
   - connection_limit=20-50 based on available memory
   - Monitor `pg_stat_activity` to adjust

3. **PostgreSQL pgBouncer** (recommended for high traffic):

   ```
   [databases]
   pagarbook = host=localhost port=5432 dbname=pagarbook

   [pgbouncer]
   pool_mode = transaction
   max_client_conn = 1000
   default_pool_size = 50
   reserve_pool_size = 10
   ```

## Performance Monitoring Queries

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Check slow queries (requires pg_stat_statements)
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```
