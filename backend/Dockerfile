# Build do backend (o frontend ja deve ter sido copiado para src/main/resources/static
# pelo build.bat, OU e servido separadamente pelo Netlify)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# uploads e banco H2 (se nao usar Postgres) ficam em /app/data e /app/media
ENV DRAMAHUB_MEDIA_DIR=/app/media
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
