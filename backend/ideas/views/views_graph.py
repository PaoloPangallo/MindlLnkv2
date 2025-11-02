# ideas/views_graph.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ideas.models import Idea, Connection



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_map(request):
    """
    🔹 Restituisce il grafo solo delle idee dell’utente corrente.
    """
    ideas = Idea.objects.filter(user=request.user).exclude(embedding=None)
    connections = Connection.objects.filter(source__user=request.user, target__user=request.user)

    nodes = [
        {
            "data": {
                "id": str(idea.id),
                "label": idea.title,
                "category": idea.category or "non classificata",
                "summary": idea.summary or "",
            }
        }
        for idea in ideas
    ]

    edges = [
        {
            "data": {
                "id": f"{conn.source.id}_{conn.target.id}",
                "source": str(conn.source.id),
                "target": str(conn.target.id),
                "type": conn.type,
                "strength": conn.strength,
            }
        }
        for conn in connections
    ]

    meta = {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "generated_by": "MindLink API (User Map)",
    }

    return Response({"meta": meta, "graph": {"nodes": nodes, "edges": edges}})



@api_view(["GET"])
@permission_classes([IsAuthenticated])  # ✅ Accesso solo utenti loggati
def get_map(request):
    """
    🔹 Restituisce il grafo completo delle idee e connessioni.
    Formato compatibile con librerie di visualizzazione (Cytoscape, ForceGraph3D, ecc.)
    """
    ideas = Idea.objects.exclude(embedding=None)
    connections = Connection.objects.select_related("source", "target").all()

    nodes = [
        {
            "data": {
                "id": str(idea.id),
                "label": idea.title,
                "category": idea.category or "non classificata",
                "summary": idea.summary or "",
            }
        }
        for idea in ideas
    ]

    edges = [
        {
            "data": {
                "id": f"{conn.source.id}_{conn.target.id}",
                "source": str(conn.source.id),
                "target": str(conn.target.id),
                "type": conn.type,
                "strength": conn.strength,
            }
        }
        for conn in connections
    ]

    meta = {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "generated_by": "MindLink API",
    }

    return Response({"meta": meta, "graph": {"nodes": nodes, "edges": edges}})
