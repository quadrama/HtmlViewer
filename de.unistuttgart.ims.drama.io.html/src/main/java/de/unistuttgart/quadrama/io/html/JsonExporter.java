package de.unistuttgart.quadrama.io.html;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import org.apache.commons.compress.utils.IOUtils;
import org.apache.commons.math3.util.Pair;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.Feature;
import org.apache.uima.fit.descriptor.ConfigurationParameter;
import org.apache.uima.fit.util.JCasUtil;
import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.tcas.Annotation;
import org.json.JSONArray;
import org.json.JSONObject;

import de.tudarmstadt.ukp.dkpro.core.api.segmentation.type.Token;
import de.unistuttgart.ims.commons.Counter;
import de.unistuttgart.ims.drama.api.Act;
import de.unistuttgart.ims.drama.api.ActHeading;
import de.unistuttgart.ims.drama.api.Author;
import de.unistuttgart.ims.drama.api.Date;
import de.unistuttgart.ims.drama.api.Drama;
import de.unistuttgart.ims.drama.api.Field;
import de.unistuttgart.ims.drama.api.Figure;
import de.unistuttgart.ims.drama.api.FigureType;
import de.unistuttgart.ims.drama.api.Scene;
import de.unistuttgart.ims.drama.api.SceneHeading;
import de.unistuttgart.ims.drama.api.Speech;
import de.unistuttgart.ims.drama.api.Translator;
import de.unistuttgart.ims.drama.api.Utterance;
import de.unistuttgart.ims.drama.util.DramaUtil;
import de.unistuttgart.ims.uimautil.WordListDescription;
import de.unistuttgart.quadrama.io.core.AbstractDramaConsumer;

public class JsonExporter extends AbstractDramaConsumer {

	public static final String PARAM_JAVASCRIPT = "Javascript declaration";
	public static final String PARAM_COLLECTION_FILENAME = "Collect";

	@ConfigurationParameter(name = PARAM_JAVASCRIPT, mandatory = false)
	String javascriptVariableName = null;

	@ConfigurationParameter(name = PARAM_COLLECTION_FILENAME, mandatory = false)
	String collectionFilename = null;

	static boolean includeType = false;

	List<JSONObject> collectedObjects = new LinkedList<JSONObject>();
	JSONArray metaJson = new JSONArray();

	@Override
	public void process(JCas aJCas) throws AnalysisEngineProcessException {

		JSONObject json = new JSONObject();
		JSONObject md = convert(JCasUtil.selectSingle(aJCas, Drama.class), false);

		for (Author author : JCasUtil.select(aJCas, Author.class))
			md.append("authors", convert(author, false));
		for (Translator translator : JCasUtil.select(aJCas, Translator.class))
			md.append("translators", convert(translator, false));
		md.put("DisplayId", DramaUtil.getDisplayId(aJCas));
		int minYear = 2000;
		for (Date date : JCasUtil.select(aJCas, Date.class)) {
			if (date.getYear() < minYear)
				minYear = date.getYear();
		}

		md.put("ReferenceDate", minYear);

		// assembly
		json = this.convertJCas(aJCas);
		metaJson.put(md);
		Writer osw = null;
		if (collectionFilename != null)
			collectedObjects.add(json);
		try {
			osw = this.getWriter(aJCas, (javascriptVariableName != null ? ".js" : ".json"));// new
																							// OutputStreamWriter(os);
			if (javascriptVariableName != null) {
				osw.write("var ");
				osw.write(javascriptVariableName);
				osw.write(" = ");
			}
			osw.write(json.toString());
			osw.flush();
			osw.close();
		} catch (IOException e) {
			throw new AnalysisEngineProcessException(e);
		} finally {
			IOUtils.closeQuietly(osw);
		}

	}

	public JSONObject convertJCas(JCas aJCas) {
		Map<Figure, Counter<Pair<String, String>>> freq = new HashMap<Figure, Counter<Pair<String, String>>>();
		List<Figure> figureList = new ArrayList<Figure>();
		Map<Figure, JSONObject> figureObjects = new HashMap<Figure, JSONObject>();

		JSONObject json = new JSONObject();
		JSONObject md = getMetadata(aJCas);
		JSONObject figureTypes = new JSONObject();

		// figures
		for (Figure figure : JCasUtil.select(aJCas, Figure.class)) {
			JSONObject fObj = convert(figure, true);
			json.append("figures", fObj);
			figureList.add(figure);
			figureObjects.put(figure, fObj);
			int fIndex = json.getJSONArray("figures").length() - 1;
			for (FigureType ftype : DramaUtil.getAllFigureTypes(figure)) {
				if (figureTypes.optJSONObject(ftype.getTypeClass()) == null)
					figureTypes.put(ftype.getTypeClass(), new JSONObject());
				figureTypes.getJSONObject(ftype.getTypeClass()).append(ftype.getTypeValue(), fIndex);
			}
			if (figureTypes.optJSONObject("All") == null)
				figureTypes.put("All", new JSONObject());
			figureTypes.getJSONObject("All").append("all", fIndex);
			freq.put(figure, new Counter<Pair<String, String>>());

		}
		json.put("ftypes", figureTypes);

		// segments
		for (Act act : JCasUtil.select(aJCas, Act.class)) {
			List<ActHeading> ahl = JCasUtil.selectCovered(ActHeading.class, act);
			if (ahl.isEmpty()) {
				json.append("acts", convert(act, false));
			} else {
				json.append("acts", convert(act, false).put("head", ahl.get(0).getCoveredText()));
			}
			for (Scene scene : JCasUtil.selectCovered(Scene.class, act)) {
				List<SceneHeading> shl = JCasUtil.selectCovered(SceneHeading.class, scene);
				if (shl.isEmpty()) {
					json.append("scs", convert(scene, false));
				} else {
					json.append("scs", convert(scene, false).put("head", shl.get(0).getCoveredText()));
				}
			}
		}
		// fields
		JSONObject fieldsObject = new JSONObject();

		for (WordListDescription f : JCasUtil.select(aJCas, WordListDescription.class)) {
			fieldsObject.put(f.getName(), convert(f, false));
		}
		json.put("fields", fieldsObject);

		// utterances
		for (Utterance utterance : JCasUtil.select(aJCas, Utterance.class)) {
			Figure f = DramaUtil.getFirstFigure(utterance);
			if (f == null)
				continue;
			int figureIndex = figureList.indexOf(f);
			JSONObject obj = new JSONObject();
			obj.put("f", figureIndex);
			obj.put("begin", utterance.getBegin());
			obj.put("end", utterance.getEnd());
			for (Speech speech : JCasUtil.selectCovered(Speech.class, utterance)) {
				JSONObject sObj = convert(speech, true);
				for (Field field : JCasUtil.selectCovered(Field.class, speech)) {
					sObj.append("fields", field.getName());
				}
				obj.append("s", sObj);

				// word frequencies
				for (Token lemma : JCasUtil.selectCovered(Token.class, speech)) {
					freq.get(f).add(new Pair<String, String>(lemma.getLemma().getValue(),
							mapPosTag(lemma.getPos().getPosValue())));
				}
			}
			json.append("utt", obj);
			figureObjects.get(f).append("utt", (json.getJSONArray("utt").length() - 1));
		}

		for (Figure figure : freq.keySet()) {
			int figureIndex = figureList.indexOf(figure);
			JSONObject arr = new JSONObject();
			for (Pair<String, String> s : freq.get(figure).keySet()) {
				JSONObject termObj = new JSONObject();
				termObj.put("w", s.getFirst());
				termObj.put("c", freq.get(figure).get(s));
				termObj.put("pos", s.getSecond());
				arr.put(s.getFirst() + "." + s.getSecond(), termObj);
			}
			json.getJSONArray("figures").getJSONObject(figureIndex).put("freq", arr);
		}

		// assembly
		json.put("meta", md);
		return json;
	}

	public static <T extends Annotation> JSONObject convert(T annotation, boolean includeText) {
		JSONObject object = new JSONObject();
		if (includeText)
			object.put("txt", annotation.getCoveredText());
		if (includeType)
			object.put("type", annotation.getType().getName());
		for (Feature feature : annotation.getType().getFeatures()) {
			if (feature.getRange().isPrimitive()) {
				String fvalue = annotation.getFeatureValueAsString(feature);
				if (feature.getRange().getName().equalsIgnoreCase("uima.cas.Integer"))
					object.put(feature.getShortName(), Integer.parseInt(fvalue));
				else if (feature.getRange().getName().equalsIgnoreCase("uima.cas.Double")) {
					double v = Double.parseDouble(fvalue);
					if (Double.isFinite(v))
						object.put(feature.getShortName(), v);
					else if (Double.isInfinite(v))
						object.put(feature.getShortName(), Double.MAX_VALUE);
					else
						object.put(feature.getShortName(), 0.0);

				} else if (feature.getRange().getName().equalsIgnoreCase("uima.cas.Boolean"))
					object.put(feature.getShortName(), Boolean.parseBoolean(fvalue));
				else if (feature.getRange().getName().equalsIgnoreCase("uima.cas.Long"))
					object.put(feature.getShortName(), Long.parseLong(fvalue));
				else
					object.put(feature.getShortName(), fvalue);

			}
		}

		return object;
	}

	@Override
	public void collectionProcessComplete() throws AnalysisEngineProcessException {
		Writer osw = null;
		try {
			osw = new FileWriter(new File(outputDirectory, "meta.json"));
			osw.write(metaJson.toString());
			osw.flush();
			osw.close();
		} catch (Exception e) {

		} finally {
			IOUtils.closeQuietly(osw);
		}

		if (collectionFilename == null)
			return;
		FileWriter fw = null;
		try {
			fw = new FileWriter(
					new File(outputDirectory, collectionFilename + (javascriptVariableName != null ? ".js" : ".json")));
			fw.write(javascriptVariableName);
			fw.write(" = new Array();\n");
			int i = 0;
			for (JSONObject obj : collectedObjects) {
				fw.write(javascriptVariableName);
				fw.write("[");
				fw.write(String.valueOf(i++));
				fw.write("] = ");
				fw.write(obj.toString());
				fw.write("\n");
			}
			fw.flush();
		} catch (IOException e) {

		} finally {
			IOUtils.closeQuietly(fw);
		}
	}

	public static String mapPosTag(String s) {
		if (s.startsWith("A"))
			return s.substring(0, 3);
		return s.substring(0, 2);
	}

	public static JSONObject getMetadata(JCas aJCas) {
		JSONObject md = convert(JCasUtil.selectSingle(aJCas, Drama.class), false);

		for (Author author : JCasUtil.select(aJCas, Author.class))
			md.append("authors", convert(author, false));
		for (Translator translator : JCasUtil.select(aJCas, Translator.class))
			md.append("translators", convert(translator, false));
		md.put("DisplayId", DramaUtil.getDisplayId(aJCas));
		return md;
	}
}
