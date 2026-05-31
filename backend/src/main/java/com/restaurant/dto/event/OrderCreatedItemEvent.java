package com.restaurant.dto.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderCreatedItemEvent {
    private Long productId;
    private String productName;
    private Integer quantity;
}
