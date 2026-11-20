CC ?= clang
CFLAGS ?= -Wall -Wextra -O2 -std=c11 -Iinclude -I../../radio/include
LDFLAGS ?= -lm

SRCS = src/main.c \
       src/resilink_crypto.c \
       src/vitals_sensor.c \
       src/risk_engine.c \
       src/delta_snapshot.c \
       src/alert_manager.c \
       src/emergency_trigger.c \
       src/route_manager.c \
       src/tft_display.c \
       src/local_uart_stream.c

TARGET = resilink_mcxn236

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CC) $(CFLAGS) -o $@ $(SRCS) $(LDFLAGS)

clean:
	rm -f $(TARGET)

run: $(TARGET)
	./$(TARGET)

.PHONY: all clean run
