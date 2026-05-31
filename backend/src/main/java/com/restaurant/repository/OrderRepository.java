package com.restaurant.repository;

import com.restaurant.entity.Order;
import com.restaurant.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatus(OrderStatus status);
    List<Order> findByTableNumber(Integer tableNumber);
    List<Order> findByStatusIn(List<OrderStatus> statuses);

    @Modifying
    @Transactional
    @Query("UPDATE Order o SET o.status = :status, o.updatedAt = CURRENT_TIMESTAMP WHERE o.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") OrderStatus status);
}
