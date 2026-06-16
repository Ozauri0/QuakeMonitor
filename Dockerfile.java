# ---------- GlobalQuake Server Java ----------
FROM eclipse-temurin:21-jre-alpine AS gq-runner

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy the pre-built JAR (must exist in project root)
ARG BUILD_ID=1
COPY GlobalQuakeServer_v0.10.1_webhook.jar ./server.jar

# Copy pre-configured database
RUN mkdir -p /app/.GlobalQuakeServerData/stationDatabase
COPY .GlobalQuakeServerData/stationDatabase/database.dat /app/.GlobalQuakeServerData/stationDatabase/database.dat
RUN chmod 777 /app/.GlobalQuakeServerData/stationDatabase/database.dat

# Create data directory for GlobalQuake
RUN mkdir -p /app/.GlobalQuakeServerData && chmod 777 /app/.GlobalQuakeServerData

# Create non-root user
RUN addgroup -g 1001 gqgroup && adduser -u 1001 -G gqgroup -D gquser

USER gquser

EXPOSE 8081
EXPOSE 8080

# Health check via Java process (no HTTP endpoint in GlobalQuake, so we check process)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD pgrep -f "server.jar" > /dev/null || exit 1

# Environment variable WEBHOOK_BASE_URL defaults to Docker Compose service name
ENV WEBHOOK_BASE_URL=http://quakemonitor:3000
ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true"

ENTRYPOINT ["java", "-jar", "server.jar", "-h"]
