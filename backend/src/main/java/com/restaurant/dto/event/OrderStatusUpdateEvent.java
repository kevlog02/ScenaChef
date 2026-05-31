package com.restaurant.dto.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusUpdateEvent {
    private Long orderId;
    private String status;
    private String updatedAt;
}
