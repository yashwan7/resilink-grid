"""
Groot System Knowledge Base and Operational Facts
Provides grounding documentation for Groot RAG queries.
Principle: Groot answers strictly from system metadata and docs.
Groot NEVER accesses medical ciphertext, keys, or decrypted data.
"""

SYSTEM_DOCUMENTATION = [
    {
        "topic": "architecture",
        "content": "RESILINK GRID is an offline-first, end-to-end encrypted, AI-assisted medical communication system. The NXP FRDM-MCXN236 edge brain samples vitals, runs TinyML risk scoring, creates delta snapshots, encrypts and signs data with ECDSA P-256 and AES-256-GCM. The hub ingests and stores ciphertext only."
    },
    {
        "topic": "security_boundary",
        "content": "The Hub backend, ESP32 radio nodes, and relays never hold encryption keys or plaintext. Decryption occurs strictly on the doctor client or patient app using WebCrypto with non-extractable keys."
    },
    {
        "topic": "routing",
        "content": "Link state TinyML monitors route stability across PORT_A Wi-Fi, PORT_B backup Wi-Fi, MESH nRF24, and SMS fallback. SOS packets are sent across all available routes simultaneously."
    },
    {
        "topic": "audit",
        "content": "The hub maintains an append-only HMAC-SHA256 hash chain over canonical JSON. Signed checkpoints are created every 100 events or 10 minutes and duplicated in secondary storage. Any modification to past logs breaks the chain and is detected by /v1/audit/verify."
    },
    {
        "topic": "emergency",
        "content": "F8 Emergency Engine operates deterministically offline without LLM. It selects the nearest free ambulance by Haversine distance and allocates the best hospital using a multi-criteria weighted score (distance, bed availability, ICU need, oxygen availability) with penalties for stale telemetry."
    }
]


def query_knowledge_base(query_text: str) -> str:
    """Simple keyword matching retriever over system documentation."""
    q_lower = query_text.lower()
    matches = []
    for doc in SYSTEM_DOCUMENTATION:
        if doc["topic"] in q_lower or any(word in q_lower for word in doc["topic"].split('_')):
            matches.append(doc["content"])
    if not matches:
        return "RESILINK GRID operates on offline-first protocols. The hub is currently running in WAL mode with active cryptographic ingest."
    return " ".join(matches)
