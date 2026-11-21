package com.example.dashboard;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardRepository {
    private final Path dbPath;

    public DashboardRepository(@Value("${dashboard.db-path:../data/dashboard.db}") String dbPath) {
        this.dbPath = Path.of(dbPath).toAbsolutePath();
    }

    private Connection connection() throws SQLException {
        if (!Files.exists(dbPath)) {
            throw new IllegalStateException("Missing database. Run: python3 etl/load_data.py");
        }
        return DriverManager.getConnection("jdbc:sqlite:" + dbPath);
    }

    public record Summary(long total, long completed, double completionRate, double averageHours) {}
    public record CategoryRow(String category, long total, long completed) {}
    public record WeekRow(String week, long total, long completed) {}

    public Summary summary() throws SQLException {
        String sql = """
                SELECT COUNT(*) AS total,
                       COALESCE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END), 0) AS completed,
                       COALESCE(ROUND(AVG(effort_hours), 1), 0) AS avg_hours
                FROM service_requests
                """;
        try (Connection conn = connection();
             var stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            long total = rs.getLong("total");
            long completed = rs.getLong("completed");
            double rate = total == 0 ? 0 : Math.round(completed * 1000.0 / total) / 10.0;
            return new Summary(total, completed, rate, rs.getDouble("avg_hours"));
        }
    }

    public List<CategoryRow> byCategory() throws SQLException {
        String sql = """
                SELECT category, COUNT(*) AS total,
                       SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
                FROM service_requests
                GROUP BY category ORDER BY category
                """;
        List<CategoryRow> rows = new ArrayList<>();
        try (Connection conn = connection();
             var stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                rows.add(new CategoryRow(rs.getString("category"), rs.getLong("total"), rs.getLong("completed")));
            }
        }
        return rows;
    }

    public List<WeekRow> byWeek() throws SQLException {
        String sql = """
                SELECT week, COUNT(*) AS total,
                       SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
                FROM service_requests
                GROUP BY week ORDER BY week
                """;
        List<WeekRow> rows = new ArrayList<>();
        try (Connection conn = connection();
             var stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                rows.add(new WeekRow(rs.getString("week"), rs.getLong("total"), rs.getLong("completed")));
            }
        }
        return rows;
    }
}
