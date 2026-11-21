package com.example.dashboard;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DashboardControllerTest {
    @Test
    void returnsSummaryAsJson() throws Exception {
        DashboardRepository repo = mock(DashboardRepository.class);
        when(repo.summary()).thenReturn(new DashboardRepository.Summary(10, 8, 80.0, 2.5));
        MockMvc client = MockMvcBuilders.standaloneSetup(new DashboardController(repo)).build();
        client.perform(get("/api/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(10))
                .andExpect(jsonPath("$.completed").value(8))
                .andExpect(jsonPath("$.completionRate").value(80.0));
    }
}
