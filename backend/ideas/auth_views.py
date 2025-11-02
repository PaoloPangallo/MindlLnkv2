from rest_framework import generics, status, permissions
from rest_framework.response import Response
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes

from ideas.serializers import RegisterSerializer


# === Registrazione ===
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        make_admin = request.data.get("is_admin", False)

        if not username or not password:
            return Response({"error": "username and password required"}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({"error": "username already exists"}, status=400)

        user = User.objects.create_user(username=username, password=password)

        # 🔹 Se vuoi permettere creazione admin via API (facoltativo)
        if make_admin:
            user.is_staff = True
            user.is_superuser = True
            user.save()

        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        access_token["username"] = user.username
        access_token["user_id"] = user.id
        access_token["is_admin"] = user.is_staff or user.is_superuser

        return Response({
            "message": "user created",
            "refresh": str(refresh),
            "access": str(access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "is_admin": user.is_staff or user.is_superuser
            }
        }, status=201)


# === Login ===
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "invalid credentials"}, status=401)

    refresh = RefreshToken.for_user(user)

    # 🔹 Inseriamo info extra nel token JWT
    access_token = refresh.access_token
    access_token["username"] = user.username
    access_token["user_id"] = user.id
    access_token["is_admin"] = user.is_staff or user.is_superuser

    return Response({
        "refresh": str(refresh),
        "access": str(access_token),
        "user": {
            "id": user.id,
            "username": user.username,
            "is_admin": user.is_staff or user.is_superuser
        }
    })

