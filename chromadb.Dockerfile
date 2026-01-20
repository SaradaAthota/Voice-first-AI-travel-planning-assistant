FROM chromadb/chroma:latest

# ChromaDB runs on port 8000 by default
EXPOSE 8000

# ChromaDB will start automatically when container runs
# No CMD needed - the base image handles it

