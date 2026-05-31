package com.restaurant.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class OrderSseService {

    private static final Logger log = LoggerFactory.getLogger(OrderSseService.class);

    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe() {
        // No timeout to keep a long-lived stream for dashboard clients.
        SseEmitter emitter = new SseEmitter(0L);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError((ex) -> emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(Map.of("message", "SSE connected")));
        } catch (IOException e) {
            emitters.remove(emitter);
            log.debug("No se pudo enviar evento inicial SSE: {}", e.getMessage());
        }

        return emitter;
    }

    public void publishOrdersChanged(Long orderId, String status, String source) {
        Map<String, Object> payload = Map.of(
                "orderId", orderId,
                "status", status,
                "source", source
        );

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("orders-changed")
                        .data(payload));
            } catch (IOException e) {
                emitters.remove(emitter);
                log.debug("Cliente SSE desconectado: {}", e.getMessage());
            }
        }
    }
}