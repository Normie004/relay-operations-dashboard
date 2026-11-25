package com.example.dashboard;

import java.sql.SQLException;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
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
    public DashboardRepository.Summary summary(@RequestParam(required = false) LocalDate week) throws SQLException {
        return repo.summary(week == null ? null : week.toString());
    }

    @GetMapping("/by-category")
    public List<DashboardRepository.CategoryRow> category(@RequestParam(required = false) LocalDate week) throws SQLException {
        return repo.byCategory(week == null ? null : week.toString());
    }

    @GetMapping("/by-week")
    public List<DashboardRepository.WeekRow> week() throws SQLException {
        return repo.byWeek();
    }

    @GetMapping("/requests")
    public List<DashboardRepository.RequestRow> requests(
            @RequestParam(required = false) LocalDate week,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category) throws SQLException {
        if (status != null && !List.of("Open", "Completed").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown request status");
        }
        return repo.requests(week == null ? null : week.toString(), status, category);
    }
}
