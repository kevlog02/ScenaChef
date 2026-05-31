package com.restaurant.dto.request;

import com.restaurant.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserRequest {
    @NotBlank(message = "El nombre es obligatorio")
    private String name;

    @NotBlank(message = "El nombre de usuario es obligatorio")
    private String username;

    private String password; // optional on update, mandatory on create

    @NotNull(message = "El rol es obligatorio")
    private Role role;

    private boolean active = true;
}
