const EPSILON = 1e-8;
const MATCH_THRESHOLD = 0.45;
const HIGH_CONFIDENCE_THRESHOLD = 0.72;
const MATCH_MARGIN_THRESHOLD = 0.015;

export const cosineSimilarity = (vectorA, vectorB) => {
  if (!vectorA?.length || !vectorB?.length || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    dot += vectorA[index] * vectorB[index];
    magnitudeA += vectorA[index] * vectorA[index];
    magnitudeB += vectorB[index] * vectorB[index];
  }

  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB) + EPSILON);
};

export const findBestMatch = (embedding, employees) => {
  const employeeMatches = [];
  const MAX_CANDIDATES = 50; // Limit loop for perf
  const employeesSample = employees.slice(0, MAX_CANDIDATES);

  for (const employee of employeesSample) {
    const candidateEmbeddings = [
      ...(employee.embeddings?.length ? employee.embeddings.slice(0, 3) : []),
      ...(employee.face_embedding?.length ? [employee.face_embedding] : [])
    ].filter((candidate, index, collection) => {
      if (!candidate?.length) {
        return false;
      }

      const serialized = JSON.stringify(candidate);
      return collection.findIndex((item) => JSON.stringify(item) === serialized) === index;
    });

    let bestEmployeeSimilarity = null;

    for (const candidateEmbedding of candidateEmbeddings) {
      const similarity = cosineSimilarity(embedding, candidateEmbedding);

      if (bestEmployeeSimilarity === null || similarity > bestEmployeeSimilarity) {
        bestEmployeeSimilarity = similarity;
      }
    }

    if (bestEmployeeSimilarity !== null) {
      employeeMatches.push({
        employee_id: employee.employee_id,
        employee_name: employee.name,
        similarity: bestEmployeeSimilarity
      });
    }
  }

  if (!employeeMatches.length) {
    throw new Error("No employee embeddings available on this kiosk.");
  }

  employeeMatches.sort((left, right) => right.similarity - left.similarity);

  const bestMatch = employeeMatches[0];
  const secondBestMatch = employeeMatches[1] || null;

  if (bestMatch.similarity < MATCH_THRESHOLD) {
    throw new Error("Low confidence match. Please try again.");
  }

  const similarityGap = bestMatch.similarity - (secondBestMatch?.similarity || 0);

  if (
    secondBestMatch &&
    similarityGap < MATCH_MARGIN_THRESHOLD &&
    bestMatch.similarity < HIGH_CONFIDENCE_THRESHOLD
  ) {
    throw new Error(
      `Face match is unclear (${bestMatch.employee_name} ${bestMatch.similarity.toFixed(3)}, next ${secondBestMatch.employee_name} ${secondBestMatch.similarity.toFixed(3)}). Please scan again in better lighting.`
    );
  }

  return {
    ...bestMatch,
    confidence: Number(bestMatch.similarity.toFixed(3)),
    similarity_gap: Number(similarityGap.toFixed(3)),
    second_best_employee_id: secondBestMatch?.employee_id || null,
    second_best_employee_name: secondBestMatch?.employee_name || null,
    second_best_similarity: secondBestMatch ? Number(secondBestMatch.similarity.toFixed(3)) : null
  };
};
