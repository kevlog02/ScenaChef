package com.restaurant.dto.request;

import com.restaurant.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrderStatusRequest {
    @NotNull(message = "El estado es obligatorio")
    private OrderStatus status;
}
