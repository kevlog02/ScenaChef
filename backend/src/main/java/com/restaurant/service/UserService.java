package com.restaurant.service;

import com.restaurant.entity.User;
import com.restaurant.dto.request.UserRequest;
import com.restaurant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + id));
    }

    public User createUser(UserRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new IllegalArgumentException("El nombre de usuario ya está registrado");
        }

        User user = new User();
        user.setName(request.getName());
        user.setUsername(request.getUsername());
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("La contraseña es obligatoria para nuevos usuarios");
        }
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setActive(request.isActive());

        return userRepository.save(user);
    }

    public User updateUser(Long id, UserRequest request) {
        User user = getUserById(id);

        // Check if updating to a username that is already taken by another user
        userRepository.findByUsername(request.getUsername()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("El nombre de usuario ya está en uso");
            }
        });

        user.setName(request.getName());
        user.setUsername(request.getUsername());
        user.setRole(request.getRole());
        user.setActive(request.isActive());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        User user = getUserById(id);
        userRepository.delete(user);
    }
}
