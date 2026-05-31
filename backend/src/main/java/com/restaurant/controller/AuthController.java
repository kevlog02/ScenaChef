package com.restaurant.controller;

import com.restaurant.dto.request.LoginRequest;
import com.restaurant.dto.response.LoginResponse;
import com.restaurant.entity.User;
import com.restaurant.repository.UserRepository;
import com.restaurant.security.CustomUserDetailsService;
import com.restaurant.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        String token = jwtUtil.generateToken(userDetails, user.getRole().name());

        return ResponseEntity.ok(new LoginResponse(token, user.getRole().name(), user.getUsername()));
    }
}
