package com.example.dashboard;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.DriverManager;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DashboardRepositoryTest {
    @TempDir Path tempDir;

    @Test
    void aggregatesRowsInSqlite() throws Exception {
        Path file = tempDir.resolve("test.db");
        try (var conn = DriverManager.getConnection("jdbc:sqlite:" + file);
             var stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE service_requests (id INTEGER, week TEXT, category TEXT, status TEXT, effort_hours REAL)");
            stmt.execute("INSERT INTO service_requests VALUES (1, '2026-10-05', 'Support', 'Completed', 2.0)");
            stmt.execute("INSERT INTO service_requests VALUES (2, '2026-10-05', 'Support', 'Open', 4.0)");
        }
        var repo = new DashboardRepository(file.toString());
        var result = repo.summary();
        assertEquals(2, result.total());
        assertEquals(1, result.completed());
        assertEquals(50.0, result.completionRate());
        assertEquals(3.0, result.averageHours());
        assertEquals(1, repo.byCategory().size());
        assertEquals(1, repo.byWeek().size());
    }
}
