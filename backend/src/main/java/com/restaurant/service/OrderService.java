package com.restaurant.service;

import com.restaurant.dto.event.OrderCreatedEvent;
import com.restaurant.dto.event.OrderCreatedItemEvent;
import com.restaurant.dto.request.OrderItemRequest;
import com.restaurant.dto.request.OrderRequest;
import com.restaurant.entity.Order;
import com.restaurant.entity.OrderItem;
import com.restaurant.entity.Product;
import com.restaurant.entity.User;
import com.restaurant.enums.OrderStatus;
import com.restaurant.repository.OrderRepository;
import com.restaurant.repository.ProductRepository;
import com.restaurant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MqttService mqttService;

    @Autowired
    private OrderSseService orderSseService;

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public Order getOrderById(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pedido no encontrado con ID: " + id));
    }

    public Order createOrder(OrderRequest request) {
        // 1. Get authenticated user
        String username;
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            username = ((UserDetails) principal).getUsername();
        } else {
            username = principal.toString();
        }

        User creator = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Usuario creador no encontrado: " + username));

        // 2. Build order entity
        Order order = new Order();
        order.setTableNumber(request.getTableNumber());
        order.setStatus(OrderStatus.PENDIENTE);
        order.setCreatedBy(creator);

        List<OrderItem> orderItems = new ArrayList<>();
        List<OrderCreatedItemEvent> eventItems = new ArrayList<>();

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("El producto con ID " + itemReq.getProductId() + " no existe"));

            if (!product.isAvailable()) {
                throw new IllegalArgumentException("El producto '" + product.getName() + "' no está disponible");
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setQuantity(itemReq.getQuantity());
            orderItem.setUnitPrice(product.getPrice());
            orderItems.add(orderItem);

            OrderCreatedItemEvent eventItem = new OrderCreatedItemEvent(
                    product.getId(),
                    product.getName(),
                    itemReq.getQuantity()
            );
            eventItems.add(eventItem);
        }

        order.setItems(orderItems);

        // 3. Save order to PostgreSQL
        Order savedOrder = orderRepository.save(order);

        // 4. Publish MQTT Event
        OrderCreatedEvent event = new OrderCreatedEvent();
        event.setOrderId(savedOrder.getId());
        event.setTableNumber(savedOrder.getTableNumber());
        event.setItems(eventItems);
        event.setStatus(savedOrder.getStatus().name());
        event.setCreatedAt(savedOrder.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        mqttService.publishOrderCreated(event);
        orderSseService.publishOrdersChanged(savedOrder.getId(), savedOrder.getStatus().name(), "backend-create");

        return savedOrder;
    }

    public Order updateOrderStatus(Long id, OrderStatus status) {
        Order order = getOrderById(id);
        order.setStatus(status);
        Order updatedOrder = orderRepository.save(order);
        orderSseService.publishOrdersChanged(updatedOrder.getId(), updatedOrder.getStatus().name(), "backend-status-update");
        return updatedOrder;
    }
}
