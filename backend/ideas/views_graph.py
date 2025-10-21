from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Idea, Connection

@api_view(["GET"])
def get_map(request):
    """
    Restituisce il grafo completo: nodi (idee) e archi (connessioni)
    """
    ideas = Idea.objects.all()
    connections = Connection.objects.all()

    nodes = [
        {
            "data": {
                "id": str(idea.id),
                "label": idea.title,
                "category": idea.category,
                "summary": idea.summary,
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

    graph = {"nodes": nodes, "edges": edges}
    return Response(graph)
