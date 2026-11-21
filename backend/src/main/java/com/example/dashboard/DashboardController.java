package com.example.dashboard;

import java.sql.SQLException;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {
    private final DashboardRepository repo;

    public DashboardController(DashboardRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/summary")
    public DashboardRepository.Summary summary() throws SQLException {
        return repo.summary();
    }

    @GetMapping("/by-category")
    public List<DashboardRepository.CategoryRow> category() throws SQLException {
        return repo.byCategory();
    }

    @GetMapping("/by-week")
    public List<DashboardRepository.WeekRow> week() throws SQLException {
        return repo.byWeek();
    }
}
