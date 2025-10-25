from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Idea, Connection

# === Connection ===
class ConnectionSerializer(serializers.ModelSerializer):
    source_title = serializers.CharField(source="source.title", read_only=True)
    target_title = serializers.CharField(source="target.title", read_only=True)

    class Meta:
        model = Connection
        fields = [
            "id",
            "source",
            "target",
            "source_title",
            "target_title",
            "type",
            "strength",
            "created_at",
        ]


# === Idea ===
class IdeaSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")
    outgoing_connections = ConnectionSerializer(many=True, read_only=True)

    class Meta:
        model = Idea
        fields = [
            "id", "title", "content", "user", "created_at",
            "summary", "category", "keywords",
            "embedding", "used_for_training",
            "outgoing_connections",
        ]

    def validate_title(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Il titolo deve contenere almeno 3 caratteri.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"]
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]
