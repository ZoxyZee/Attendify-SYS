from typing import Any

import base64
from functools import lru_cache

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    import cv2
    import numpy as np
except Exception as exc:  # pragma: no cover
    cv2 = None
    np = None
    CV_IMPORT_ERROR = exc
else:
    CV_IMPORT_ERROR = None

try:
    from insightface.app import FaceAnalysis
except Exception as exc:  # pragma: no cover
    FaceAnalysis = None
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None


router = APIRouter(prefix="/recognition", tags=["recognition"])
MATCH_THRESHOLD = 0.45
MATCH_MARGIN = 0.03
OPENCV_MATCH_THRESHOLD = 0.25
OPENCV_MATCH_MARGIN = 0.01
MAX_EMPLOYEE_EMBEDDINGS = 5


class ExtractEmbeddingRequest(BaseModel):
    image_base64: str


class FrameImageRequest(BaseModel):
    image_rgb_base64: str
    width: int = Field(gt=0, le=1920)
    height: int = Field(gt=0, le=1920)


class EmployeePayload(BaseModel):
    employee_id: str
    name: str
    embeddings: list[list[float]] = Field(default_factory=list)


class RecognizeRequest(BaseModel):
    image_base64: str
    employees: list[EmployeePayload] = Field(default_factory=list)


class RecognizeFrameRequest(FrameImageRequest):
    employees: list[EmployeePayload] = Field(default_factory=list)


class DetectedFace:
    def __init__(self, bbox: Any, embedding: Any, det_score: float = 1.0, engine: str = "opencv"):
        self.bbox = np.asarray(bbox, dtype=np.float32)
        self.embedding = np.asarray(embedding, dtype=np.float32)
        self.det_score = det_score
        self.engine = engine


def cosine_similarity(vector_a: Any, vector_b: Any) -> float:
    denominator = (np.linalg.norm(vector_a) * np.linalg.norm(vector_b)) or 1.0
    return float(np.dot(vector_a, vector_b) / denominator)


def normalize_embedding(values: Any) -> Any:
    vector = np.asarray(values, dtype=np.float32)
    norm = np.linalg.norm(vector)
    return vector if norm == 0 else vector / norm


@lru_cache(maxsize=1)
def get_opencv_face_detector():
    if cv2 is None:
        raise RuntimeError(f"Recognition dependencies are unavailable: {CV_IMPORT_ERROR}")
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(cascade_path)
    if detector.empty():
        raise RuntimeError("OpenCV face detector could not be loaded.")
    return detector


def build_opencv_embedding(image: Any, bbox: Any) -> Any:
    left, top, right, bottom = [int(round(value)) for value in bbox]
    image_height, image_width = image.shape[:2]
    padding_x = int((right - left) * 0.18)
    padding_y = int((bottom - top) * 0.22)
    left = max(0, left - padding_x)
    top = max(0, top - padding_y)
    right = min(image_width, right + padding_x)
    bottom = min(image_height, bottom + padding_y)

    face_crop = image[top:bottom, left:right]
    if face_crop.size == 0:
        raise HTTPException(status_code=422, detail="Face crop was not usable. Try scanning again.")

    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    resized = cv2.resize(gray, (64, 64), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    resized = (resized - float(resized.mean())) / (float(resized.std()) + 1e-6)
    return normalize_embedding(resized.flatten())


def get_single_face_with_opencv(image: Any):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    detections = get_opencv_face_detector().detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=5,
        minSize=(80, 80)
    )

    if len(detections) == 0:
        raise HTTPException(status_code=422, detail="No face detected. Center one face in the guide.")
    if len(detections) > 1:
        raise HTTPException(status_code=422, detail="Multiple faces detected. Scan one employee at a time.")

    x, y, width, height = [float(value) for value in detections[0]]
    bbox = np.asarray([x, y, x + width, y + height], dtype=np.float32)
    return DetectedFace(bbox=bbox, embedding=build_opencv_embedding(image, bbox), det_score=1.0, engine="opencv")


def decode_image(image_base64: str):
    if cv2 is None or np is None:
        raise HTTPException(status_code=500, detail=f"Recognition dependencies are unavailable: {CV_IMPORT_ERROR}")
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image payload.") from exc
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unable to decode image.")
    return image


def decode_rgb_frame(image_rgb_base64: str, width: int, height: int):
    if cv2 is None or np is None:
        raise HTTPException(status_code=500, detail=f"Recognition dependencies are unavailable: {CV_IMPORT_ERROR}")
    try:
        frame_bytes = base64.b64decode(image_rgb_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 frame payload.") from exc

    expected_length = width * height * 3
    if len(frame_bytes) != expected_length:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid frame size. Expected {expected_length} RGB bytes, received {len(frame_bytes)}."
        )

    image_rgb = np.frombuffer(frame_bytes, dtype=np.uint8).reshape((height, width, 3))
    return cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)


@lru_cache(maxsize=1)
def get_face_app():
    if cv2 is None or np is None:
        raise RuntimeError(f"Recognition dependencies are unavailable: {CV_IMPORT_ERROR}")
    if FaceAnalysis is None:
        raise RuntimeError(f"InsightFace is unavailable: {IMPORT_ERROR}")
    try:
        # Try GPU first (NVIDIA CUDA), fallback CPU
        face_app = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
        face_app.prepare(ctx_id=0, det_size=(640, 640))  # ctx_id=0 for GPU
        print("Using GPU for InsightFace")
    except:
        face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        face_app.prepare(ctx_id=-1, det_size=(640, 640))
        print("Fallback to CPU for InsightFace")
    return face_app


def get_single_face(image: Any):
    if FaceAnalysis is None:
        face = get_single_face_with_opencv(image)
    else:
        try:
            faces = get_face_app().get(image)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Recognition model failed to run: {exc}") from exc
        if not faces:
            raise HTTPException(status_code=422, detail="No face detected. Center one face in the guide.")
        if len(faces) > 1:
            raise HTTPException(status_code=422, detail="Multiple faces detected. Scan one employee at a time.")
        face = faces[0]

    image_height, image_width = image.shape[:2]
    left, top, right, bottom = [float(value) for value in face.bbox.tolist()]
    face_width = max(1.0, right - left)
    face_height = max(1.0, bottom - top)
    face_coverage = (face_width * face_height) / max(1.0, image_height * image_width)
    if face_coverage < 0.06:
        raise HTTPException(status_code=422, detail="Move closer so your face fills the oval guide.")
    if face_coverage > 0.72:
        raise HTTPException(status_code=422, detail="Move a little farther back so your full face fits inside the guide.")

    return face


def rotated_capture_images(image: Any):
    yield image
    yield cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
    yield cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
    yield cv2.rotate(image, cv2.ROTATE_180)


def get_single_face_from_capture(image: Any):
    last_error = None

    for candidate_image in rotated_capture_images(image):
        try:
            return get_single_face(candidate_image)
        except HTTPException as exc:
            last_error = exc

    if last_error is not None:
        raise last_error

    raise HTTPException(status_code=422, detail="No face detected. Center one face in the guide.")


def recognize_face(face: Any, employees: list[EmployeePayload]):
    if not employees:
        raise HTTPException(status_code=400, detail="No employee embeddings were supplied to the recognition service.")

    probe_embedding = normalize_embedding(face.embedding)
    probe_dimensions = int(probe_embedding.shape[0])
    best_match = None
    second_best = None
    compatible_embedding_count = 0

    for employee in employees:
        best_employee_similarity = None

        for candidate in employee.embeddings[:MAX_EMPLOYEE_EMBEDDINGS]:
            if not candidate:
                continue
            candidate_vector = np.asarray(candidate, dtype=np.float32)

            if candidate_vector.ndim != 1 or candidate_vector.shape[0] != probe_dimensions:
                continue

            compatible_embedding_count += 1
            similarity = cosine_similarity(probe_embedding, normalize_embedding(candidate_vector))
            if best_employee_similarity is None or similarity > best_employee_similarity:
                best_employee_similarity = similarity

        if best_employee_similarity is None:
            continue

        match_candidate = {
            "employee_id": employee.employee_id,
            "employee_name": employee.name,
            "similarity": best_employee_similarity
        }
        if best_match is None or best_employee_similarity > best_match["similarity"]:
            second_best = best_match
            best_match = match_candidate
        elif second_best is None or best_employee_similarity > second_best["similarity"]:
            second_best = match_candidate

    if compatible_embedding_count == 0:
        raise HTTPException(
            status_code=422,
            detail=(
                f"No compatible employee embeddings were provided for this recognition engine "
                f"({probe_dimensions} dimensions). Re-import or re-enroll employees on the kiosk."
            )
        )

    if best_match is None:
        raise HTTPException(status_code=400, detail="No usable employee embeddings were provided.")

    margin = best_match["similarity"] - (second_best["similarity"] if second_best else 0.0)
    threshold = OPENCV_MATCH_THRESHOLD if getattr(face, "engine", "") == "opencv" else MATCH_THRESHOLD
    margin_threshold = OPENCV_MATCH_MARGIN if getattr(face, "engine", "") == "opencv" else MATCH_MARGIN

    if best_match["similarity"] < threshold:
        raise HTTPException(status_code=422, detail=f"Low confidence match ({best_match['similarity']:.3f}). Please rescan in better lighting.")
    if second_best and margin < margin_threshold:
        raise HTTPException(status_code=422, detail="Face match is too close to another employee. Capture cleaner enrollment samples and rescan.")

    return {
        "employee_id": best_match["employee_id"],
        "employee_name": best_match["employee_name"],
        "confidence": round(float(best_match["similarity"]), 3),
        "similarity": round(float(best_match["similarity"]), 3),
        "similarity_gap": round(float(margin), 3),
        "face_box": [float(value) for value in face.bbox.tolist()],
        "det_score": float(face.det_score)
    }


@router.post("/extract-embedding")
def extract_embedding(payload: ExtractEmbeddingRequest):
    face = get_single_face_from_capture(decode_image(payload.image_base64))
    embedding = normalize_embedding(face.embedding).tolist()
    return {
        "success": True,
        "data": {
            "embedding": embedding,
            "face_box": [float(value) for value in face.bbox.tolist()],
            "det_score": float(face.det_score),
            "engine": getattr(face, "engine", "insightface")
        }
    }


@router.post("/extract-embedding-frame")
def extract_embedding_frame(payload: FrameImageRequest):
    face = get_single_face(decode_rgb_frame(payload.image_rgb_base64, payload.width, payload.height))
    embedding = normalize_embedding(face.embedding).tolist()
    return {
        "success": True,
        "data": {
            "embedding": embedding,
            "face_box": [float(value) for value in face.bbox.tolist()],
            "det_score": float(face.det_score),
            "engine": getattr(face, "engine", "insightface")
        }
    }


@router.post("/recognize")
def recognize(payload: RecognizeRequest):
    face = get_single_face_from_capture(decode_image(payload.image_base64))
    return {
        "success": True,
        "data": recognize_face(face, payload.employees)
    }


@router.post("/recognize-frame")
def recognize_frame(payload: RecognizeFrameRequest):
    face = get_single_face(decode_rgb_frame(payload.image_rgb_base64, payload.width, payload.height))
    return {
        "success": True,
        "data": recognize_face(face, payload.employees)
    }
