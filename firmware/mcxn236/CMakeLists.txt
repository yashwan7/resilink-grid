cmake_minimum_required(VERSION 3.10)
project(resilink_mcxn236 C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wextra -O2")

include_directories(
    include
    ../../radio/include
)

set(SOURCES
    src/main.c
    src/resilink_crypto.c
    src/vitals_sensor.c
    src/risk_engine.c
    src/delta_snapshot.c
    src/alert_manager.c
    src/emergency_trigger.c
    src/route_manager.c
    src/tft_display.c
    src/local_uart_stream.c
)

add_executable(resilink_mcxn236 ${SOURCES})
target_link_libraries(resilink_mcxn236 m)
