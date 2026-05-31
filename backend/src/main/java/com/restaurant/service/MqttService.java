package com.restaurant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.restaurant.dto.event.OrderCreatedEvent;
import com.restaurant.dto.event.OrderStatusUpdateEvent;
import com.restaurant.enums.OrderStatus;
import com.restaurant.repository.OrderRepository;
import jakarta.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
public class MqttService implements MqttCallback {

    private static final Logger log = LoggerFactory.getLogger(MqttService.class);

    @Autowired
    private MqttClient mqttClient;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private OrderSseService orderSseService;

    @Value("${mqtt.topic.order.created}")
    private String topicOrderCreated;

    @Value("${mqtt.topic.order.status.updated}")
    private String topicOrderStatus;

    @PostConstruct
    public void subscribe() {
        try {
            mqttClient.setCallback(this);
            mqttClient.subscribe(topicOrderStatus, 1); // QoS 1
            log.info("Suscrito al topic de MQTT: {}", topicOrderStatus);
        } catch (MqttException e) {
            log.error("Error al suscribirse al topic MQTT: {}", e.getMessage(), e);
        }
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            MqttMessage message = new MqttMessage(payload.getBytes(StandardCharsets.UTF_8));
            message.setQos(1);
            message.setRetained(false);
            mqttClient.publish(topicOrderCreated, message);
            log.info("Evento de pedido creado publicado en MQTT: {}", topicOrderCreated);
        } catch (Exception e) {
            log.error("Error al publicar evento de pedido creado: {}", e.getMessage(), e);
        }
    }

    @Override
    public void connectionLost(Throwable cause) {
        log.error("Conexión perdida con el Broker MQTT: {}", cause != null ? cause.getMessage() : "Desconocido");
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        log.info("Mensaje MQTT recibido en topic: {}", topic);
        if (topic.equals(topicOrderStatus)) {
            try {
                String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
                log.info("Payload recibido: {}", payload);
                
                OrderStatusUpdateEvent event = objectMapper.readValue(payload, OrderStatusUpdateEvent.class);
                
                log.info("Actualizando estado de pedido #{} a {}", event.getOrderId(), event.getStatus());
                int rowsUpdated = orderRepository.updateStatus(event.getOrderId(), OrderStatus.valueOf(event.getStatus()));
                
                if (rowsUpdated > 0) {
                    log.info("Pedido #{} actualizado correctamente", event.getOrderId());
                    orderSseService.publishOrdersChanged(event.getOrderId(), event.getStatus(), "mqtt-status-update");
                } else {
                    log.warn("No se encontró el pedido #{} para actualizar", event.getOrderId());
                }
            } catch (Exception e) {
                log.error("Error procesando actualización de estado MQTT: {}", e.getMessage(), e);
            }
        }
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
        // No-op
    }
}
