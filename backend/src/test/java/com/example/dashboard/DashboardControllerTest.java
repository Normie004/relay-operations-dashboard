package com.example.dashboard;

import java.nio.file.Path;
import java.sql.DriverManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DashboardControllerTest {
    @TempDir Path tempDir;
    MockMvc client;

    @BeforeEach
    void setUp() throws Exception {
        Path file = tempDir.resolve("requests.db");
        try (var db = DriverManager.getConnection("jdbc:sqlite:" + file); var stmt = db.createStatement()) {
            stmt.execute("CREATE TABLE service_requests (id INTEGER, week TEXT, category TEXT, status TEXT, effort_hours REAL)");
            stmt.execute("INSERT INTO service_requests VALUES (14, '2026-10-19', 'Reporting', 'Open', 3), "
                    + "(15, '2026-10-26', 'Reporting', 'Completed', 1)");
        }
        client = MockMvcBuilders.standaloneSetup(new DashboardController(new DashboardRepository(file.toString()))).build();
    }

    @Test
    void returnsSummaryAsJson() throws Exception {
        client.perform(get("/api/summary")).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2)).andExpect(jsonPath("$.completed").value(1))
                .andExpect(jsonPath("$.completionRate").value(50.0));
    }

    @Test
    void filtersRequestDetailAndRejectsInvalidFilters() throws Exception {
        client.perform(get("/api/summary").param("week", "2026-10-19"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        client.perform(get("/api/requests").param("week", "2026-10-19")
                        .param("status", "Open").param("category", "Reporting"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(14));
        client.perform(get("/api/requests").param("status", "Unknown")).andExpect(status().isBadRequest());
        client.perform(get("/api/requests").param("week", "yesterday")).andExpect(status().isBadRequest());
    }
}
