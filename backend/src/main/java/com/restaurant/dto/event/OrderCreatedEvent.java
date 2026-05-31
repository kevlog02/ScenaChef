package com.restaurant.dto.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreatedEvent {
    private Long orderId;
    private Integer tableNumber;
    private List<OrderCreatedItemEvent> items;
    private String status;
    private String createdAt;
}
