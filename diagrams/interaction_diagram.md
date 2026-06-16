# Diagrama de Interacción - MTG Manager

Este documento detalla la interacción entre los usuarios (Jugadores), los administradores de la tienda y las diferentes funcionalidades del sistema **MTG Manager**. Al igual que el ERD, se estructura de manera visual y descriptiva basándose en el diseño de rutas del proyecto ([src/app](file:///c:/Users/jorge/.gemini/antigravity/scratch/mtg-manager/src/app)) y componentes ([src/components](file:///c:/Users/jorge/.gemini/antigravity/scratch/mtg-manager/src/components)).

---

## 1. Mapa General de Casos de Uso

El siguiente mapa muestra a qué módulos y funcionalidades tiene acceso cada actor del sistema:

```mermaid
graph LR
    classDef player fill:#2a4494,stroke:#3b5998,stroke-width:2px,color:#fff;
    classDef admin fill:#8b1a1a,stroke:#b22222,stroke-width:2px,color:#fff;
    classDef feature fill:#1e293b,stroke:#475569,stroke-width:2px,color:#cbd5e1;

    Player((Jugador)):::player
    Admin((Administrador)):::admin

    %% Features
    T_Mgt[Gestión de Torneos]:::feature
    S_Store[Tienda de Singles]:::feature
    BL_Mgt[Gestión de Buylist]:::feature
    Alerts[Alertas y Notificaciones]:::feature
    News[Artículos y Noticias]:::feature
    Settings[Ajustes de Tienda]:::feature

    %% Player Interactions
    Player -->|Registrarse / Subir Deck / Jugar Rondas| T_Mgt
    Player -->|Buscar / Añadir al Carrito / Comprar| S_Store
    Player -->|Enviar Solicitud de Venta| BL_Mgt
    Player -->|Suscribirse a Alertas de Stock/Precio| Alerts
    Player -->|Leer Novedades| News

    %% Admin Interactions
    Admin -->|Crear Torneo / Iniciar Rondas / Registrar Resultados| T_Mgt
    Admin -->|Gestionar Inventario / Ajustar Precios| S_Store
    Admin -->|Aprobar o Rechazar Solicitudes| BL_Mgt
    Admin -->|Crear Reglas / Recibir Alertas| Alerts
    Admin -->|Publicar Artículos| News
    Admin -->|Configurar Tasas y Umbrales| Settings
```

---

## 2. Diagramas de Secuencia (Flujos de Interacción)

### A. Flujo del Ciclo de Vida de un Torneo
Muestra el proceso desde que el Administrador publica un evento hasta que el Jugador finaliza las rondas y recibe premios.

```mermaid
sequenceDiagram
    autonumber
    actor Player as Jugador
    actor Admin as Administrador / TO
    participant System as Sistema MTG Manager

    Admin->>System: Crear torneo (Formato, Rondas, Puntos)
    System-->>Player: Mostrar torneo en "Upcoming"
    Player->>System: Registrarse en torneo (Pagar cuota)
    Player->>System: Subir Decklist (URL de mazo)
    Admin->>System: Iniciar Torneo (Generar Emparejamientos Suiza)
    System-->>Player: Notificar Mesa y Oponente
    System-->>Admin: Mostrar Rondas Activas
    loop Cada Ronda del Torneo
        Player->>System: Registrar resultado del Match (Puntos / Misiones)
        Note over Player, Admin: El Admin también puede registrar/modificar resultados si hay disputas
        Admin->>System: Finalizar Ronda
        System-->>Admin: Calcular Clasificación Temporal
        Admin->>System: Iniciar Siguiente Ronda (si procede)
    end
    Admin->>System: Finalizar Torneo
    System->>System: Distribuir Premios automáticamente (Crédito de Tienda)
    System-->>Player: Otorgar UserPrize y notificar
```

### B. Flujo de Compra de Singles y Alertas de Stock
Interacción con el catálogo e-commerce e inventario físico.

```mermaid
sequenceDiagram
    autonumber
    actor Player as Jugador
    actor Admin as Administrador
    participant System as Sistema MTG Manager

    Admin->>System: Sincronizar catálogo con Scryfall
    Admin->>System: Registrar Stock (Condición, acabado, precio manual)
    Admin->>System: Configurar Reglas de Precios Dinámicos
    System->>System: Actualizar precio de venta según reglas
    Player->>System: Buscar carta en inventario
    alt Carta sin Stock
        Player->>System: Suscribirse a Alerta de Stock
        Admin->>System: Agregar stock del artículo solicitado
        System-->>Player: Notificar: "¡Carta en Stock!"
    else Carta en Stock
        Player->>System: Añadir carta al Carrito
        Player->>System: Realizar checkout (Compra con Crédito de Tienda/Efectivo)
        System->>System: Crear Pedido (Order) y reducir Stock
        System-->>Admin: Notificar Pedido para Preparación
    end
```

### C. Flujo de Buylist (Venta de cartas a la tienda)
Proceso por el cual los jugadores venden su material sobrante y obtienen crédito o efectivo.

```mermaid
sequenceDiagram
    autonumber
    actor Player as Jugador
    actor Admin as Administrador
    participant System as Sistema MTG Manager

    Admin->>System: Configurar tasa de compra (Default Rate: Cash vs Credit)
    Admin->>System: Configurar Buylist Price Bands (Márgenes por valor)
    Player->>System: Buscar cartas en el portal Buylist
    Player->>System: Agregar cartas a solicitud de venta (Condición, idioma)
    System->>System: Calcular precio ofrecido (Market price * rate)
    Player->>System: Enviar BuylistRequest (CASH o STORE_CREDIT)
    System-->>Admin: Notificar nueva solicitud pendiente
    Admin->>System: Inspeccionar cartas físicas y validar estado
    alt Solicitud Aprobada
        Admin->>System: Aprobar BuylistRequest
        System->>System: Actualizar estado a APPROVED
        System->>System: Incrementar stock de cartas físicas automáticamente
        alt Pago en Crédito de Tienda
            System->>System: Incrementar `storeCredit` del Usuario
        end
        System-->>Player: Notificar Aprobación y Pago
    else Solicitud Rechazada
        Admin->>System: Rechazar BuylistRequest
        System-->>Player: Notificar Rechazo
    end
```

---

## 3. Matriz de Roles y Permisos (RBAC)

El sistema opera bajo dos roles primarios definidos en la base de datos (`PLAYER` y `STORE_OWNER` / `ADMIN`). Sus accesos y capacidades se distribuyen de la siguiente manera:

| Funcionalidad / Acción | Jugador (PLAYER) | Administrador (ADMIN) |
| :--- | :---: | :---: |
| **Torneos** | | |
| Registrarse y pagar | Sí | - |
| Subir/actualizar Decklist | Sí | - |
| Reportar resultados de ronda propia | Sí | Sí |
| Modificar resultados ajenos o forzar rondas | No | Sí |
| Crear y parametrizar torneos | No | Sí |
| **Catálogo e Inventario** | | |
| Buscar cartas y ver gráficos de precios | Sí | Sí |
| Modificar stock físico (cantidades/precios) | No | Sí |
| Configurar reglas de precios automáticas | No | Sí |
| Sincronizar catálogo con Scryfall | No | Sí |
| **Compras (E-Commerce)** | | |
| Añadir al carrito y finalizar pedido | Sí | - |
| Consultar historial de pedidos propios | Sí | - |
| Consultar y preparar pedidos generales | No | Sí |
| **Buylist (Venta a Tienda)** | | |
| Crear y enviar solicitud de venta | Sí | - |
| Configurar márgenes de compra y tasas | No | Sí |
| Aprobar / Rechazar solicitudes de buylist | No | Sí |
| **Configuraciones y Contenido** | | |
| Crear, editar o borrar artículos del blog | No | Sí |
| Configurar datos y límites de la tienda | No | Sí |
| Modificar crédito de tienda de cualquier usuario | No | Sí |
