package com.restaurant.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class OrderRequest {
    @NotNull(message = "El número de mesa es obligatorio")
    @Min(value = 1, message = "El número de mesa debe ser mayor a 0")
    private Integer tableNumber;

    @NotEmpty(message = "El pedido debe contener al menos un producto")
    private List<OrderItemRequest> items;
}
