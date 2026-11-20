# RESILINK GRID Hub Backend Makefile
# Owner: Harshith
# Principle: AI predicts, rules decide, logs prove.

.PHONY: run test seed demo tamper openapi clean help

help:
	@echo "Available commands:"
	@echo "  make run      - Run hub FastAPI server without Docker"
	@echo "  make test     - Run full pytest test suite (T2-T9, T13, T15, T17, T18)"
	@echo "  make seed     - Reseed demo facilities, devices, and routes"
	@echo "  make demo     - Run interactive end-to-end demo script"
	@echo "  make tamper   - Run audit hash chain tamper detection demonstration"
	@echo "  make openapi  - Export openapi.json for doctor client & firmware teams"
	@echo "  make clean    - Reset data and purge test databases"

run:
	python run.py

test:
	pytest tests/ -v

seed:
	python scripts/seed_data.py

demo:
	python scripts/demo_script.py

tamper:
	python scripts/tamper_demo.py

openapi:
	python scripts/export_openapi.py

clean:
	rm -rf data/*.db* data/checkpoints_mirror/*
