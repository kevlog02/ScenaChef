package com.restaurant.repository;

import com.restaurant.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByAvailable(boolean available);
    List<Product> findByCategory(String category);
}
