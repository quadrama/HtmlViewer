package de.unistuttgart.quadrama.io.html;

import java.io.IOException;

import org.apache.uima.UIMAException;
import org.apache.uima.collection.CollectionReaderDescription;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.apache.uima.fit.factory.CollectionReaderFactory;
import org.apache.uima.fit.pipeline.SimplePipeline;
import org.apache.uima.resource.ResourceInitializationException;
import org.junit.Test;

import de.tudarmstadt.ukp.dkpro.core.io.xmi.XmiReader;
import de.unistuttgart.quadrama.core.FigureSpeechStatistics;

public class TestJsonExporter {

	@Test
	public void testExporter() throws ResourceInitializationException, UIMAException, IOException {
		CollectionReaderDescription crd = CollectionReaderFactory.createReaderDescription(XmiReader.class,
				XmiReader.PARAM_SOURCE_LOCATION, "/Users/reiterns/Documents/QuaDramA/Data/xmi/tg/*.xmi",
				XmiReader.PARAM_LENIENT, true);

		SimplePipeline.runPipeline(crd, AnalysisEngineFactory.createEngineDescription(FigureSpeechStatistics.class),
				AnalysisEngineFactory.createEngineDescription(JsonExporter.class, JsonExporter.PARAM_OUTPUT_DIRECTORY,
						"target/"));
	}
}
