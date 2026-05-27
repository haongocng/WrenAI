export const ECOMMERCE_GOOD_REVIEW_SQL = `
WITH payment_agg AS (
  SELECT
    order_id,
    MAX(payment_type) AS payment_type,
    AVG(payment_installments) AS payment_installments,
    SUM(payment_value) AS payment_value
  FROM olist_order_payments_dataset
  GROUP BY order_id
),
item_agg AS (
  SELECT
    oi.order_id,
    SUM(oi.price) AS price,
    SUM(oi.freight_value) AS freight_value,
    AVG(p.product_weight_g) AS product_weight_g,
    AVG(p.product_photos_qty) AS product_photos_qty,
    AVG(p.product_length_cm) AS product_length_cm,
    AVG(p.product_height_cm) AS product_height_cm,
    AVG(p.product_width_cm) AS product_width_cm
  FROM olist_order_items_dataset oi
  LEFT JOIN olist_products_dataset p
    ON oi.product_id = p.product_id
  GROUP BY oi.order_id
)
SELECT
  o.order_id,
  c.customer_state,
  c.customer_city,
  o.order_status,
  pa.payment_type,
  pa.payment_installments,
  pa.payment_value,
  ia.price,
  ia.freight_value,
  ia.product_weight_g,
  ia.product_photos_qty,
  ia.product_length_cm,
  ia.product_height_cm,
  ia.product_width_cm,
  CASE
    WHEN o.order_delivered_customer_date IS NOT NULL
     AND o.order_purchase_timestamp IS NOT NULL
    THEN date_diff('day', o.order_purchase_timestamp, o.order_delivered_customer_date)
    ELSE NULL
  END AS delivery_days,
  CASE
    WHEN o.order_delivered_customer_date IS NOT NULL
     AND o.order_estimated_delivery_date IS NOT NULL
     AND o.order_delivered_customer_date > o.order_estimated_delivery_date
    THEN 1
    ELSE 0
  END AS late_delivery,
  r.review_score
FROM olist_orders_dataset o
JOIN olist_customers_dataset c
  ON o.customer_id = c.customer_id
JOIN olist_order_reviews_dataset r
  ON o.order_id = r.order_id
LEFT JOIN payment_agg pa
  ON o.order_id = pa.order_id
LEFT JOIN item_agg ia
  ON o.order_id = ia.order_id
WHERE r.review_score IS NOT NULL
LIMIT 1000
`;
