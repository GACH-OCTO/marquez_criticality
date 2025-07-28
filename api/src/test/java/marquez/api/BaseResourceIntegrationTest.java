/*
 * Copyright 2018-2022 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.api;

import static marquez.common.models.CommonModelGenerator.newConnectionUrlFor;
import static marquez.common.models.CommonModelGenerator.newDatasetName;
import static marquez.common.models.CommonModelGenerator.newDbSourceType;
import static marquez.common.models.CommonModelGenerator.newDescription;
import static marquez.common.models.CommonModelGenerator.newFieldName;
import static marquez.common.models.CommonModelGenerator.newFieldType;
import static marquez.common.models.CommonModelGenerator.newJobName;
import static marquez.common.models.CommonModelGenerator.newLocation;
import static marquez.common.models.CommonModelGenerator.newNamespaceName;
import static marquez.common.models.CommonModelGenerator.newOwnerName;
import static marquez.common.models.CommonModelGenerator.newSourceName;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import io.dropwizard.testing.ConfigOverride;
import io.dropwizard.testing.ResourceHelpers;
import io.dropwizard.testing.junit5.DropwizardAppExtension;
import io.openlineage.client.OpenLineage;
import io.openlineage.client.OpenLineageClient;
import io.openlineage.client.transports.HttpTransport;
import java.net.URI;
import java.net.URL;
import java.util.Set;
import marquez.MarquezApp;
import marquez.MarquezConfig;
import marquez.client.MarquezClient;
import marquez.client.Utils;
import marquez.client.models.DatasetId;
import marquez.client.models.DbTableMeta;
import marquez.client.models.Field;
import marquez.client.models.JobId;
import marquez.client.models.JobMeta;
import marquez.client.models.JobType;
import marquez.client.models.NamespaceMeta;
import marquez.client.models.SourceMeta;
import marquez.client.models.Tag;
import marquez.common.models.SourceType;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Base class for {@code resource} integration tests. */
@org.junit.jupiter.api.Tag("IntegrationTests")
@Testcontainers
abstract class BaseResourceIntegrationTest {
  static final String ERROR_NAMESPACE_NOT_FOUND = "Namespace '%s' not found.";
  static final String ERROR_JOB_VERSION_NOT_FOUND = "Job version '%s' not found.";
  static final String ERROR_JOB_NOT_FOUND = "Job '%s' not found.";
  static final String ERROR_FAIL_IF_NOT_IN = "Expected '%s' in '%s'.";

  @Container
  static final PostgreSQLContainer<?> DB_CONTAINER = new PostgreSQLContainer<>("postgres:14");

  static {
    DB_CONTAINER.start();
  }

  /* The OL producer. */
  static final URI OL_PRODUCER =
      URI.create(
          "https://github.com/MarquezProject/marquez/tree/main/api/src/test/java/marquez/api/models/ActiveRun.java");

  /* Load test configuration. */
  static final String CONFIG_FILE = "config.test.yml";
  static final String CONFIG_FILE_PATH = ResourceHelpers.resourceFilePath(CONFIG_FILE);

  /* Tags defined in 'config.test.yml'. */
  static final Tag P1 = new Tag("P1", "Donnée.s Personnelle.s de criticité faible");
  static final Tag P2 = new Tag("P2", "Donnée.s Personnelle.s de criticité moyenne");
  static final Tag P3 = new Tag("P3", "Donnée.s Personnelle.s de criticité élevée");
  static final Tag P4 = new Tag("P4", "Donnée.s Personnelle.s de criticité importante");
  static final Tag P5 = new Tag("P5", "Donnée.s Personnelle.s de criticité très importante");
  static final Tag V1 = new Tag("V1", "Donnée.s Vitale.s de criticité faible");
  static final Tag V2 = new Tag("V2", "Donnée.s Vitale.s de criticité moyenne");
  static final Tag V3 = new Tag("V3", "Donnée.s Vitale.s de criticité élevée");
  static final Tag V4 = new Tag("V4", "Donnée.s Vitale.s de criticité importante");
  static final Tag V5 = new Tag("V5", "Donnée.s Vitale.s de criticité très importante");
  static final Tag S1 = new Tag("S1", "Donnée.s Stratégique.s de criticité faible");
  static final Tag S2 = new Tag("S2", "Donnée.s Stratégique.s de criticité moyenne");
  static final Tag S3 = new Tag("S3", "Donnée.s Stratégique.s de criticité élevée");
  static final Tag S4 = new Tag("S4", "Donnée.s Stratégique.s de criticité importante");
  static final Tag S5 = new Tag("S5", "Donnée.s Stratégique.s de criticité très importante");


  // Namespace
  static String NAMESPACE_NAME;
  static String NAMESPACE_DESCRIPTION;
  static String OWNER_NAME;

  // Source
  static String SOURCE_TYPE;
  static String SOURCE_NAME;
  static URI CONNECTION_URL;
  static String SOURCE_DESCRIPTION;

  // Dataset
  static String DB_TABLE_SOURCE_TYPE;
  static String DB_TABLE_SOURCE_NAME;
  static URI DB_TABLE_CONNECTION_URL;
  static String DB_TABLE_SOURCE_DESCRIPTION;
  static DatasetId DB_TABLE_ID;
  static String DB_TABLE_NAME;
  static String DB_TABLE_PHYSICAL_NAME;
  static String DB_TABLE_DESCRIPTION;
  static Set<String> DB_TABLE_TAGS;
  static DbTableMeta DB_TABLE_META;
  static ImmutableList<Field> DB_TABLE_FIELDS;

  // Job
  static String JOB_NAME;
  static JobId JOB_ID;
  static JobType JOB_TYPE;
  static URL JOB_LOCATION;
  static String JOB_DESCRIPTION;
  static JobMeta JOB_META;
  static Set<String> JOB_TAGS;

  static DropwizardAppExtension<MarquezConfig> MARQUEZ_APP;
  static OpenLineage OL;
  static OpenLineageClient OL_CLIENT;
  static MarquezClient MARQUEZ_CLIENT;

  @BeforeAll
  public static void setUpOnce() throws Exception {
    // (1) Use a randomly generated namespace/dataset
    NAMESPACE_NAME = newNamespaceName().getValue();
    NAMESPACE_DESCRIPTION = newDescription();
    OWNER_NAME = newOwnerName().getValue();

    SOURCE_TYPE = newDbSourceType().getValue();
    SOURCE_NAME = newSourceName().getValue();
    SOURCE_DESCRIPTION = newDescription();

    DB_TABLE_SOURCE_TYPE = SourceType.of("POSTGRESQL").getValue();
    DB_TABLE_SOURCE_NAME = SOURCE_NAME;
    DB_TABLE_SOURCE_DESCRIPTION = newDescription();
    DB_TABLE_ID = newDatasetIdWith(NAMESPACE_NAME);
    DB_TABLE_NAME = DB_TABLE_ID.getName();
    DB_TABLE_PHYSICAL_NAME = DB_TABLE_NAME;
    DB_TABLE_DESCRIPTION = newDescription();
    DB_TABLE_TAGS = ImmutableSet.of(P1.getName());
    DB_TABLE_CONNECTION_URL = newConnectionUrlFor(SourceType.of("POSTGRESQL"));
    DB_TABLE_FIELDS = ImmutableList.of(newFieldWith(V1.getName()), newField());
    DB_TABLE_META =
        DbTableMeta.builder()
            .physicalName(DB_TABLE_PHYSICAL_NAME)
            .sourceName(DB_TABLE_SOURCE_NAME)
            .fields(DB_TABLE_FIELDS)
            .tags(DB_TABLE_TAGS)
            .description(DB_TABLE_DESCRIPTION)
            .build();

    JOB_NAME = newJobName().getValue();
    JOB_ID = new JobId(NAMESPACE_NAME, JOB_NAME);
    JOB_TYPE = JobType.BATCH;
    JOB_LOCATION = newLocation();
    JOB_DESCRIPTION = newDescription();
    JOB_TAGS = ImmutableSet.of(P1.getName());
    JOB_META =
        JobMeta.builder()
            .type(JOB_TYPE)
            .inputs(ImmutableSet.of())
            .outputs(ImmutableSet.of())
            .location(JOB_LOCATION)
            .description(JOB_DESCRIPTION)
            .tags(JOB_TAGS)
            .build();
    // (2) Configure Marquez application using test configuration and database.
    MARQUEZ_APP =
        new DropwizardAppExtension<>(
            MarquezApp.class,
            CONFIG_FILE_PATH,
            ConfigOverride.config("db.url", DB_CONTAINER.getJdbcUrl()),
            ConfigOverride.config("db.user", DB_CONTAINER.getUsername()),
            ConfigOverride.config("db.password", DB_CONTAINER.getPassword()));
    MARQUEZ_APP.before();

    final URL url = Utils.toUrl("http://localhost:" + MARQUEZ_APP.getLocalPort());

    // (3) Configure clients.
    OL = new OpenLineage(OL_PRODUCER);
    OL_CLIENT =
        OpenLineageClient.builder()
            .transport(HttpTransport.builder().uri(url.toURI()).build())
            .build();
    MARQUEZ_CLIENT = MarquezClient.builder().baseUrl(url).build();
  }

  protected void createNamespace(String namespaceName) {
    // (1) Create namespace for db table
    final NamespaceMeta namespaceMeta =
        NamespaceMeta.builder().ownerName(OWNER_NAME).description(NAMESPACE_DESCRIPTION).build();

    MARQUEZ_CLIENT.createNamespace(namespaceName, namespaceMeta);
  }

  protected static DatasetId newDatasetIdWith(final String namespaceName) {
    return new DatasetId(namespaceName, newDatasetName().getValue());
  }

  protected static Field newField() {
    return newFieldWith(ImmutableSet.of());
  }

  protected static Field newFieldWith(final String tag) {
    return newFieldWith(ImmutableSet.of(tag));
  }

  protected static Field newFieldWith(final ImmutableSet<String> tags) {
    return new Field(newFieldName().getValue(), newFieldType(), tags, newDescription());
  }

  protected void createSource(String sourceName) {
    final SourceMeta sourceMeta =
        SourceMeta.builder()
            .type(DB_TABLE_SOURCE_TYPE)
            .connectionUrl(DB_TABLE_CONNECTION_URL)
            .description(DB_TABLE_SOURCE_DESCRIPTION)
            .build();
    MARQUEZ_CLIENT.createSource(sourceName, sourceMeta);
  }

  @AfterAll
  public static void cleanUp() {
    MARQUEZ_APP.after();
  }
}
