
package com.example.demo.ticket;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Bet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sessionId;
    private Integer ticketId;

    @Column(precision = 19, scale = 2)
    private BigDecimal amount;

    private LocalDateTime time;

    public Bet(String sessionId, Integer ticketId, BigDecimal amount, LocalDateTime time) {
        this.sessionId = sessionId;
        this.ticketId = ticketId;
        this.amount = amount;
        this.time = time;
    }
}

package com.example.demo.ticket;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/bets")
@CrossOrigin("*")
public class BetController {

    private final BetService betService;
    private final BettingSessionManager bettingSessionManager;

    public BetController(BetService betService, BettingSessionManager bettingSessionManager) {
        this.betService = betService;
        this.bettingSessionManager = bettingSessionManager;
    }

    // New endpoint for creating an inactive session
    @PostMapping("/session/create")
    public ResponseEntity<BettingSession> createBettingSession(@RequestParam String sessionId) {
        BettingSession session = bettingSessionManager.createSession(sessionId);
        if (session != null) {
            return new ResponseEntity<>(session, HttpStatus.CREATED);
        }
        return new ResponseEntity<>(HttpStatus.CONFLICT);
    }

    // New endpoint for activating a created session
    @PostMapping("/session/activate/{sessionId}")
    public ResponseEntity<BettingSession> activateBettingSession(@PathVariable String sessionId) {
        BettingSession session = bettingSessionManager.startSession(sessionId);
        if (session != null) {
            return new ResponseEntity<>(session, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @GetMapping("/sessions/active")
    public ResponseEntity<List<BettingSession>> getActiveSessions() {
        return new ResponseEntity<>(bettingSessionManager.getActiveSessions(), HttpStatus.OK);
    }

    @GetMapping("/session/status/{sessionId}")
    public ResponseEntity<BettingSession> getSessionStatus(@PathVariable String sessionId) {
        BettingSession session = bettingSessionManager.getSession(sessionId);
        if (session != null) {
            return new ResponseEntity<>(session, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping("/session/stop/{sessionId}")
    public ResponseEntity<Void> stopBettingSession(@PathVariable String sessionId) {
        if (bettingSessionManager.isSessionActive(sessionId)) {
            bettingSessionManager.stopSession(sessionId);
            return new ResponseEntity<>(HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping("/place/{sessionId}")
    public ResponseEntity<Object> placeBet(@PathVariable String sessionId, @RequestBody Bet bet) {
        if (!bettingSessionManager.isSessionActive(sessionId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("The given duration time has exceeded. This session is no longer active.");
        }
        try {
            Bet newBet = betService.placeBet(sessionId, bet.getTicketId(), bet.getAmount());
            return new ResponseEntity<>(newBet, HttpStatus.OK);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        }
    }

    @GetMapping("/winner/{sessionId}")
    public ResponseEntity<Bet> getWinner(@PathVariable String sessionId) {
        Optional<Bet> winner = betService.determineWinner(sessionId);
        if (winner.isPresent()) {
            return new ResponseEntity<>(winner.get(), HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @GetMapping("/all/{sessionId}")
    public List<Bet> getAllBetsForSession(@PathVariable String sessionId) {
        return betService.getAllBetsForSession(sessionId);
    }

    @GetMapping("/highest/{sessionId}")
    public Optional<Bet> getHighestBetForSession(@PathVariable String sessionId) {
        return betService.getHighestBetForSession(sessionId);
    }

> HARI KRISHANAN AI:
@GetMapping("/lowest/{sessionId}")
    public Optional<Bet> getLowestBetForSession(@PathVariable String sessionId) {
        return betService.getLowestBetForSession(sessionId);
    }
}

> HARI KRISHANAN AI:
package com.example.demo.ticket;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.concurrent.ScheduledFuture;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class BettingSession {

    @Id
    private String sessionId;

    private Instant startTime;
    private long durationMinutes;
    private long taskIntervalSeconds;
    private boolean active;

    @Transient
    @JsonIgnore
    private transient ScheduledFuture<?> scheduledFuture;

    // New constructor for creating a session without starting it
    public BettingSession(String sessionId, long durationMinutes, long taskIntervalSeconds) {
        this.sessionId = sessionId;
        this.durationMinutes = durationMinutes;
        this.taskIntervalSeconds = taskIntervalSeconds;
        this.active = false;
    }
}

> HARI KRISHANAN AI:
package com.example.demo.ticket;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Component
public class BettingSessionManager {

    private static final Logger log = LoggerFactory.getLogger(BettingSessionManager.class);
    private final ThreadPoolTaskScheduler taskScheduler;
    private final BetService betService;
    private final BettingSessionRepository bettingSessionRepository;
    private final BetRepository betRepository;

    private final Map<String, BettingSession> scheduledSessionsRuntimeMap;
    private static final long FIXED_DURATION_MINUTES = 5;
    private static final long FIXED_TASK_INTERVAL_SECONDS = 5;

    public BettingSessionManager(BetService betService, BettingSessionRepository bettingSessionRepository, BetRepository betRepository) {
        this.betService = betService;
        this.bettingSessionRepository = bettingSessionRepository;
        this.betRepository = betRepository;
        this.taskScheduler = new ThreadPoolTaskScheduler();
        this.taskScheduler.setPoolSize(Runtime.getRuntime().availableProcessors() * 2);
        this.taskScheduler.setThreadNamePrefix("BettingSessionScheduler-");
        this.taskScheduler.initialize();
        this.scheduledSessionsRuntimeMap = new ConcurrentHashMap<>();
    }

    @PostConstruct
    public void initializeScheduledSessions() {
        log.info("Initializing BettingSessionManager: Loading active sessions from database...");
        bettingSessionRepository.findByActiveTrue().forEach(session -> {
            if (session.getStartTime().plus(Duration.ofMinutes(session.getDurationMinutes())).isBefore(Instant.now())) {
                log.info("Session '{}' found in DB but already expired. Marking as inactive and stopping.", session.getSessionId());
                session.setActive(false);
                bettingSessionRepository.save(session);
            } else {
                log.info("Re-scheduling active session '{}' (remaining time: {} minutes).",
                        session.getSessionId(),
                        Duration.between(Instant.now(), session.getStartTime().plus(Duration.ofMinutes(session.getDurationMinutes()))).toMinutes());

                ScheduledFuture<?> periodicTask = taskScheduler.scheduleAtFixedRate(() -> {
                    runSessionTask(session.getSessionId());
                }, Duration.ofSeconds(session.getTaskIntervalSeconds()));

                session.setScheduledFuture(periodicTask);
                scheduledSessionsRuntimeMap.put(session.getSessionId(), session);

                taskScheduler.schedule(() -> {
                    stopSession(session.getSessionId());
                }, session.getStartTime().plus(Duration.ofMinutes(session.getDurationMinutes())));
            }
        });
        log.info("BettingSessionManager initialized. {} active sessions re-scheduled from DB.", scheduledSessionsRuntimeMap.size());
    }

    @Transactional
    public BettingSession createSession(String sessionId) {
        if (bettingSessionRepository.existsById(sessionId)) {
            log.warn("Session with ID '{}' already exists. Cannot create a new one.", sessionId);
            return null;
        }
        BettingSession session = new BettingSession(sessionId, FIXED_DURATION_MINUTES, FIXED_TASK_INTERVAL_SECONDS);
        bettingSessionRepository.save(session);
        log.info("New betting session '{}' created. It is currently inactive.", sessionId);
        return session;
    }

> HARI KRISHANAN AI:
@Transactional
    public BettingSession startSession(String sessionId) {
        Optional<BettingSession> sessionOptional = bettingSessionRepository.findById(sessionId);
        if (sessionOptional.isEmpty()) {
            log.warn("Session with ID '{}' does not exist. Cannot start it.", sessionId);
            return null;
        }

        BettingSession session = sessionOptional.get();
        if (session.isActive()) {
            log.warn("Session with ID '{}' is already active. Cannot start it again.", sessionId);
            return null;
        }

        session.setActive(true);
        session.setStartTime(Instant.now());
        bettingSessionRepository.save(session);

        log.info("Starting betting session '{}'. It will run for {} minutes.", sessionId, session.getDurationMinutes());

        ScheduledFuture<?> periodicTask = taskScheduler.scheduleAtFixedRate(() -> {
            runSessionTask(sessionId);
        }, Duration.ofSeconds(session.getTaskIntervalSeconds()));
        session.setScheduledFuture(periodicTask);

        taskScheduler.schedule(() -> {
            stopSession(sessionId);
        }, session.getStartTime().plus(Duration.ofMinutes(session.getDurationMinutes())));

        scheduledSessionsRuntimeMap.put(sessionId, session);
        return session;
    }

    public List<BettingSession> getActiveSessions() {
        return bettingSessionRepository.findByActiveTrue();
    }

    private void runSessionTask(String sessionId) {
        BettingSession session = scheduledSessionsRuntimeMap.get(sessionId);
        if (session != null && session.isActive()) {
            log.info("--- Session '{}' running... ---", sessionId);
            betService.findAndLogHighestAndLowestForSession(sessionId);
        }
    }

    public void stopSession(String sessionId) {
        BettingSession session = scheduledSessionsRuntimeMap.remove(sessionId);

        bettingSessionRepository.findById(sessionId).ifPresent(dbSession -> {
            if (dbSession.isActive()) {
                dbSession.setActive(false);
                bettingSessionRepository.save(dbSession);
                log.info("Betting session '{}' marked as inactive in DB.", sessionId);
            }
        });

        if (session != null && session.getScheduledFuture() != null) {
            session.getScheduledFuture().cancel(false);
            log.info("Scheduled task for session '{}' cancelled.", sessionId);
        } else {
            log.warn("Attempted to stop session '{}' not found in runtime map or already inactive.", sessionId);
        }
    }

    public boolean isSessionActive(String sessionId) {
        Optional<BettingSession> dbSession = bettingSessionRepository.findById(sessionId);
        return dbSession.isPresent() && dbSession.get().isActive();
    }

    public BettingSession getSession(String sessionId) {
        return bettingSessionRepository.findById(sessionId).orElse(null);
    }

    @PreDestroy
    public void shutdown() {
        scheduledSessionsRuntimeMap.values().forEach(session -> {
            if (session.getScheduledFuture() != null) {
                session.getScheduledFuture().cancel(false);
            }
        });
        taskScheduler.shutdown();
        log.info("Betting session manager has been shut down.");
    }
}

> HARI KRISHANAN AI:
package com.example.demo.ticket;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class BettingSessionRequest {
    private String sessionId;
    private long durationMinutes;
    private long taskIntervalSeconds;
}

> HARI KRISHANAN AI:
package com.example.demo.ticket;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/decrease-bets")
@CrossOrigin("*")
public class DecreaseBetController {

    private final DecreaseBetService decreaseBetService;
    private final BettingSessionManager bettingSessionManager;

    public DecreaseBetController(DecreaseBetService decreaseBetService, BettingSessionManager bettingSessionManager) {
        this.decreaseBetService = decreaseBetService;
        this.bettingSessionManager = bettingSessionManager;
    }

    // New endpoint for creating an inactive session
    @PostMapping("/session/create")
    public ResponseEntity<BettingSession> createBettingSession(@RequestParam String sessionId) {
        BettingSession session = bettingSessionManager.createSession(sessionId);
        if (session != null) {
            return new ResponseEntity<>(session, HttpStatus.CREATED);
        }
        return new ResponseEntity<>(HttpStatus.CONFLICT);
    }

    // New endpoint for activating a created session
    @PostMapping("/session/activate/{sessionId}")
    public ResponseEntity<BettingSession> activateBettingSession(@PathVariable String sessionId) {
        BettingSession session = bettingSessionManager.startSession(sessionId);
        if (session != null) {
            return new ResponseEntity<>(session, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @GetMapping("/sessions/active")
    public ResponseEntity<List<BettingSession>> getActiveSessions() {
        return new ResponseEntity<>(bettingSessionManager.getActiveSessions(), HttpStatus.OK);
    }

    @GetMapping("/session/status/{sessionId}")
    public ResponseEntity<BettingSession> getSessionStatus(@PathVariable String sessionId) {
        BettingSession session = bettingSessionManager.getSession(sessionId);
        if (session != null) {
            return new ResponseEntity<>(session, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping("/session/stop/{sessionId}")
    public ResponseEntity<Void> stopBettingSession(@PathVariable String sessionId) {
        if (bettingSessionManager.isSessionActive(sessionId)) {
            bettingSessionManager.stopSession(sessionId);
            return new ResponseEntity<>(HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping("/place/{sessionId}")
    public ResponseEntity<Object> placeBet(@PathVariable String sessionId, @RequestBody Bet bet) {
        if (!bettingSessionManager.isSessionActive(sessionId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("The given session has expired or is not active.");
        }
        try {
            Bet newBet = decreaseBetService.placeBet(sessionId, bet.getTicketId(), bet.getAmount());
            return new ResponseEntity<>(newBet, HttpStatus.OK);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        }
    }

    @GetMapping("/winner/{sessionId}")
    public ResponseEntity<Bet> getWinner(@PathVariable String sessionId) {
        Optional<Bet> winner = decreaseBetService.determineWinner(sessionId);
        if (winner.isPresent()) {
            return new ResponseEntity<>(winner.get(), HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @GetMapping("/all/{sessionId}")
    public List<Bet> getAllBetsForSession(@PathVariable String sessionId) {
        return decreaseBetService.getAllBetsForSession(sessionId);
    }

    @GetMapping("/highest/{sessionId}")
    public Optional<Bet> getHighestBetForSession(@PathVariable String sessionId) {
        return decreaseBetService.getHighestBetForSession(sessionId);
    }

> HARI KRISHANAN AI:
@GetMapping("/lowest/{sessionId}")
    public Optional<Bet> getLowestBetForSession(@PathVariable String sessionId) {
        return decreaseBetService.getLowestBetForSession(sessionId);
    }
}

> HARI KRISHANAN AI:
package com.example.demo.ticket;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class RemainingTimeResponse {
    private String sessionId;
    private long remainingSeconds;
}

> HARI KRISHANAN AI:
package com.example.demo.ticket;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;

@RestController
@RequestMapping("/api/session-time")
@CrossOrigin("*")
public class SessionTimeController {

    private final SessionTimeService sessionTimeService;
    private final BettingSessionManager bettingSessionManager;

    public SessionTimeController(SessionTimeService sessionTimeService, BettingSessionManager bettingSessionManager) {
        this.sessionTimeService = sessionTimeService;
        this.bettingSessionManager = bettingSessionManager;
    }

    @GetMapping("/remaining/{sessionId}")
    public ResponseEntity<Object> getRemainingTime(@PathVariable String sessionId) {
        BettingSession session = bettingSessionManager.getSession(sessionId);

        if (session == null) {
            return new ResponseEntity<>("Session not found.", HttpStatus.NOT_FOUND);
        }

        if (!session.isActive()) {
            return new ResponseEntity<>("The session has ended.", HttpStatus.OK);
        }

        long remainingSeconds = sessionTimeService.getRemainingTimeSeconds(sessionId);

        if (remainingSeconds > 0) {
            RemainingTimeResponse response = new RemainingTimeResponse(sessionId, remainingSeconds);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } else {
            return new ResponseEntity<>("The session has ended.", HttpStatus.OK);
        }
    }
}

> HARI KRISHANAN AI:
http://localhost:8081/api/bets/sessions/active
