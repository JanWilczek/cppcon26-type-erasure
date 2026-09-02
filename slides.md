---
theme: default
colorSchema: light
title: Type-Erased Audio Parameters
titleTemplate: '%s - Jan Wilczek ADC Japan 2026'
info: |
  ## Type-Erased Audio Parameters

  Jan Wilczek's Audio Developer Conference Japan 2026 talk
author: Jan Wilczek
export:
  format: pdf
  timeout: 30000
  dark: false
  withClicks: false
  withToc: false
# https://sli.dev/features/drawing
drawings:
  persist: false
# slide transition: https://sli.dev/guide/animations.html#slide-transitions
transition: undefined
# enable Comark Syntax: https://comark.dev/syntax/markdown
comark: true
# duration of the presentation
duration: 50min
lineNumbers: true
fonts:
  sans: Montserrat, Open Sans
  mono: CaskaydiaCove Nerd Font
  local: CaskaydiaCove Nerd Font
---

# Using Type Erasure to Extend APIs You Don't Own

## A Case Study From Audio Plugin Development

### Jan Wilczek (think-cell)

The Dutch C++ Group Meetup

Amsterdam, September 4th, 2026

---

# Who am I?

<v-clicks>

- Jan Wilczek \[Yan Vil-check\]
- Founder of TheWolfSound.com & online course creator
- C++ Speaker at think-cell

</v-clicks>

---
layout: cover
---

<img src="./assets/tc_homepage_hero.webp" class="w-full h-full"/>

<!-- Please, interrupt me. I will be showing a lot of code so you may get lost. Please, stop me and ask question, even if it's just because you fell asleep -->

---
layout: center
---

# Who knows what audio plugins for digital audio workstations are?

---
layout: center
---

# Who has heard about the JUCE C++ framework?

---
layout: cover
---

<img src="./assets/ableton-live.png" class="h-120 w-auto"/>

<!-- - Here's how a modern DAW looks like tracks, transport, assets, and... plugins -->
<!-- - Plugins extend DAW capabilities: think sound synthesizers, and audio effects such as reverb -->

---

# Audio plugin formats

<img src="./assets/Plugin_API.png" class="h-50 w-auto"/>

 <!-- DAWs communicate with plugins via plugin APIs also called plugin formats -->

---

# Audio plugin formats

<img src="./assets/Plugins_in_formats.png" class="h-75 w-auto"/>

 <!-- There are many of them... -->

---

# JUCE C++ framework

<img src="./assets/JUCE_is_the_magical_tool.png" class="h-75 w-auto"/>

<!-- The JUCE C++ framework allows having a single codebase to generate wrappers for most of the mainstream plugin formats -->

 <!-- It also allows general-purpose cross-platform app creation (think Qt) -->

 <!-- But today, we're not talking about audio processing algorithms, but about state management in audio plugins, in particular, audio parameters. -->

---

# Plugin processor and editor

<img src="./assets/Processor-Editor_split.png" />

 <!-- Plugins, in particular plugins created with JUCE, consist of two main classes: processor and editor. Think editor=UI and processor=audio processing, host communication, state management, and everything else. -->
 <!-- Part of the plugin's state are parameters; user-adjustable, UI-displayable, audio-controlling values. -->

---

# Parameters in audio plugins

```plantuml
@startuml
hide empty members
hide circle

PluginProcessor *--> Parameters
PluginEditor --> Parameters
"Host (DAW)" --> Parameters
@enduml
```

<v-clicks>

* Automation
* Serialization
* Presets (generic/custom)
* Visualization (generic/custom)
* UI (generic/custom)

</v-clicks>

---

# Example of plugin parameters in action

<div class="relative w-full h-full">
  <div v-click class="flex justify-center mt-4">
    <img src="./assets/Processor.svg" class="h-50 rounded shadow-lg" />
  </div>
  <div class="absolute bottom-10 left-0 right-0 h-60">
    <img v-click src="./assets/UI.png" class="absolute left-[0%]  bottom-0 h-48 rounded shadow-xl" />
    <img v-click src="./assets/GenericEditor.png" class="absolute left-[10%] bottom-4 h-42 rounded shadow-xl" />
    <img v-click src="./assets/ParameterUI.png" class="absolute left-[20%] bottom-0 h-56 rounded" />
    <img v-click src="./assets/Modulation.png" class="absolute left-[15%] bottom-4 h-42 rounded shadow-xl"/>
    <img v-click src="./assets/ReaperPresets.png" class="absolute left-[40%] bottom-0 h-48 rounded shadow-xl" />
  </div>
</div>

---

# Gain parameter example

<img src="./assets/gain.jpeg" class="h-85"/>

 <!-- As an example, let's consider a plugin's volume, also called the gain. It can be represented as a floating-point value in the [0, 1] range that scales the plugin's output. 1 means no change in volume, and 0 means complete silence. Let's take a look at the requirements of such a parameter: -->

---
hide: true
---

# Gain parameter requirements

<v-clicks>

- it controls the volume of the sound output by the plugin
- it must be displayed in the UI
- it must be reported to the host to meet its requirements (requirement of plugin APIs)
- it can be adjusted by the user via a slider in the plugin's UI
- it can be adjusted by the user in host's automation view
- it must be persisted between DAW project reloads
- it should be easy to serialize for user presets
- it's access must be real-time-safe (read/written on the audio thread, updated on the UI thread)

</v-clicks>

---

# Recap

<v-clicks>

- **audio plugin**: a plugin for a digital audio workstation (DAW)
- **plugin processor**: the core of an audio plugin; responsible for plugin metadata, audio processing, and state management
- **plugin editor**: user interface (UI) of the plugin
- **plugin parameter**: a user-controllable value influencing audio processing of a plugin
    - `juce::AudioParameterFloat|Bool|Int|Choice` class instance in JUCE plugins
- **UI state**: non-audio-related state
- **serialization**: process of externalizing state (for example, to a JSON file)
- **deserialization**: process of loading state from an external source (for example, a JSON file)
- **preset** = plugin parameter values + metadata

</v-clicks>

---

# Parameter class hierarchy in JUCE

<div class="mt-30">
    <img src="./assets/AudioProcessorParameterClassHierarchy.svg"/>
</div>

---

# JUCE parameter classes

<v-clicks>
 
* `AudioParameterBool`
  * `true`/`false`
* `AudioParameterInt`
  * integer in a closed range
  * e.g., "1" from \{0, 1, 2\}
* `AudioParameterFloat`
  * real value from a closed range
  * e.g., "0.25" from \[0, 2\]
* `AudioParameterChoice`
  * a value from a fixed set of named options
  * e.g., "lowpass" from \{"lowpass", "highpass"\}

</v-clicks>

 <!-- We discussed a floating-point parameter but JUCE provides four types of parameters; we can create further types by extending one of the parameter classes. -->

---
layout: center
---

# How do we use parameters?

---

<style> .slidev-layout { zoom: 65%; }</style>

# Plugin processor

```cpp
class PluginProcessor : public AudioProcessor {
public:
  PluginProcessor();
  ~PluginProcessor();

  void prepareToPlay(double sampleRate, int samplesPerBlock) override;
  void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
  bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
#endif

  void processBlock(AudioBuffer<float>&, MidiBuffer&) override;

  AudioProcessorEditor* createEditor() override;
  bool hasEditor() const override;

  const String getName() const override;

  bool acceptsMidi() const override;
  bool producesMidi() const override;
  bool isMidiEffect() const override;
  double getTailLengthSeconds() const override;

  int getNumPrograms() override;
  int getCurrentProgram() override;
  void setCurrentProgram(int index) override;
  const String getProgramName(int index) override;
  void changeProgramName(int index, const String& newName) override;

  void getStateInformation(MemoryBlock& destData) override;
  void setStateInformation(const void* data, int sizeInBytes) override;

private:
  juce::AudioParameterFloat& gain;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginProcessor)
};
```

---

# Parameters via references only

```cpp
class PluginProcessor : public juce::AudioProcessor {
public:
    PluginProcessor();
    //...
private:
    juce::AudioParameterFloat& gain;
    //...
};
```

 <!-- We cannot own the parameter classes (no unique_ptr, no values) to avoid double delete -->

---

# Parameters via references only

```cpp {all|13-14|2|4-6|8|7,9}
namespace {
juce::AudioParameterFloat& createGainParameter(juce::AudioProcessor& processor) {
  constexpr auto versionHint = 1;
  auto parameter = std::make_unique<juce::AudioParameterFloat>(
          juce::ParameterID{"gain", versionHint}, "Gain",
          juce::NormalisableRange<float>{0.f, 1.f, 0.01f}, 1.f);
  auto& result = *parameter;
  processor.addParameter(parameter.release());
  return result;
}
} // namespace

PluginProcessor::PluginProcessor() : //...
    gain{createGainParameter(*this)} {}
```

<!-- Note that we must release ownership -->

---

# Parameters via references only

## Usage in audio processing

```cpp
void PluginProcessor::processBlock(juce::AudioBuffer<float>& buffer,
                                   juce::MidiBuffer&) {
  //...
  buffer.applyGain(gain.get());
}
```

---

# Parameters via references only

## Usage in UI

```cpp
class PluginEditor : public juce::AudioProcessorEditor {
public:
  explicit PluginEditor(PluginProcessor&);

  void resized() override;

private:
  juce::Slider gainSlider;
  juce::SliderParameterAttachment gainAttachment;
};
```

---

# Parameters via references only

## Usage in UI

```cpp {none|1,4}
PluginEditor::PluginEditor(PluginProcessor& p)
    : AudioProcessorEditor(&p),
      gainAttachment{p.gain, gainButton} {}
```

---

# Parameters via references only

## Serialization

```cpp {none|1-4|6-14|3}
void PluginProcessor::getStateInformation(juce::MemoryBlock& destData) {
  juce::MemoryOutputStream outputStream{destData, true};
  JsonSerializer::serialize(gain, outputStream);
}

void PluginProcessor::setStateInformation(const void* data, int sizeInBytes) {
  juce::MemoryInputStream inputStream{data, static_cast<size_t>(sizeInBytes),
                                      false};
  const auto result = JsonSerializer::deserialize(inputStream, gain);
  if (result.failed()) {
    // notify the user
  }
}
```

 <!-- JUCE provides `setStateInformation()` and `getStateInformation()` callbacks in the PluginProcessor to allows reading and writing plugin state (incl. parameters). -->
<!-- serialize() hides the complexity -->

---

# Parameters via references only

## Serialization

<style> .slidev-layout { zoom: 80%; }</style>

```cpp {all|2-4,24-25}
struct SerializableParameters {
  float rate;
  bool bypassed;
  juce::String waveform;

  static constexpr auto marshallingVersion = 1;

  template <typename Archive, typename T>
  static void serialise(Archive& archive, T& p) {
    using namespace juce;

    if (archive.getVersion() != 1) {
      return;
    }

    std::string pluginName = TREMOLO_PLUGIN_NAME;

    archive(named("pluginName", pluginName));

    if (pluginName != TREMOLO_PLUGIN_NAME) {
      return;
    }

    archive(named("modulationRateHz", p.rate), named("bypassed", p.bypassed),
            named("modulationWaveform", p.waveform));
  }
};
```

<!-- Key point: we need a separate struct that describes parameter values (duplication) -->

---


```cpp {9-10|1-7,11|17-20}
SerializableParameters from(const Parameters& p) {
  return {
      .rate = p.rate.get(),
      .bypassed = p.bypassed.get(),
      .waveform = p.waveform.getCurrentChoiceName(),
  };
}

void JsonSerializer::serialize(const Parameters& parameters,
                               juce::OutputStream& output) {
  const auto json = juce::ToVar::convert(from(parameters));

  if (!json.has_value()) {
    return;
  }

  juce::JSON::writeToStream(output, *json,
                            juce::JSON::FormatOptions{}
                                .withSpacing(juce::JSON::Spacing::multiLine)
                                .withMaxDecimalPlaces(2));
}
```

<!-- And deserialization code is very similar  -->

---

# Parameters via references only

<v-clicks>

## Pros

- Full type safety
- Easy access to singular parameters
    - `processBlock()`
- We can use any serialization format we like
- Serialization code can be reused for presets
- Easy UI attachments
- Possibility to add UI state serialization

## Cons

- "Manual" serialization code
    - Adding new parameters requires updating `JsonSerializer` $\implies$ error-prone

</v-clicks>

---

# Parameters via a vector of base class pointers

<div class="mt-30">
    <img src="./assets/AudioProcessorParameterClassHierarchy.svg"/>
</div>

```cpp
class PluginProcessor : public juce::AudioProcessor {
    //...
    std::vector<juce::RangedAudioParameter*> parameters;
};
```


<!-- We cannot hold values, just references or pointers -->

---

# Parameters via a vector of base class pointers

```cpp
class JUCE_API  AudioParameterBool  : public RangedAudioParameter
{
public:
    bool get() const noexcept;
    operator bool() const noexcept;
    //...
};

class JUCE_API RangedAudioParameter   : public AudioProcessorParameterWithID
{
public:
    float convertTo0to1(float v) const noexcept;
    float convertFrom0to1(float v) const noexcept;

    // inherited:

    /* Hosts will expect the value returned to be between 0 and 1.0. */
    float getValue() const;

    /* The value passed will be between 0 and 1.0. */
    void setValue(float newValue);
};
```

---

# Parameters via a vector of base class pointers

```xml
<?xml version="1.0" encoding="UTF-8"?>

<EdenSynthParameters>
  <PARAM id="envelope.adbdr.attack.curve" value="1.0"/>
  <PARAM id="envelope.adbdr.attack.time" value="30.0"/>
  <PARAM id="envelope.adbdr.breakLevel" value="0.6000000238418579"/>
  <PARAM id="envelope.adbdr.decay1.curve" value="1.0"/>
  <PARAM id="envelope.adbdr.decay1.time" value="20.0"/>
  <PARAM id="envelope.adbdr.decay2.curve" value="1.0"/>
  <PARAM id="envelope.adbdr.decay2.time" value="20000.0"/>
  <PARAM id="envelope.adbdr.release.curve" value="1.0"/>
  <PARAM id="envelope.adbdr.release.time" value="300.0"/>
  <PARAM id="filter.contourAmount" value="1.0"/>
  <PARAM id="filter.cutoff" value="1.0"/>
  <PARAM id="filter.passbandAttenuation" value="0.0"/>
  <PARAM id="filter.resonance" value="0.0"/>
  <PARAM id="frequencyOfA4" value="440.0"/>
  <!-- more parameters... -->
  <PARAM id="output.volume" value="1.0"/>
  <PARAM id="pitchBend.semitonesDown" value="-12.0"/>
  <PARAM id="pitchBend.semitonesUp" value="2.0"/>
  <PARAM id="waveshaper.autoMakeUpGain" value="0.0"/>
</EdenSynthParameters>
```

<!-- It's not interpretable, something the musicians can work with -->
<!-- I wanted a serialization format that allows state saving as well as preset handling -->

---

# Summary so far

1. We can treat plugin parameters individually using only concrete `juce::AudioParameterFloat|Bool|Int|Choice` classes $\implies$ We cannot (easily) define operations on a collection of parameters
1. We can treat plugin parameters as a collection of `juce::RangedAudioParameter`s $\implies$ We lose type information

---

# Summary so far

1. Parameter collection: extensibility
1. Individual parameters: interpretability

---
layout: center
---

# How can we treat parameters as a collection without losing type information? 🤔

<v-click>
<h2>Answer: Type Erasure!</h2>
</v-click>

<!-- I don't want explain what type erasure is. Instead we'll discover this pattern while solving this problem. -->

---
layout: center
class: text-center
---

# Type-Erased Parameters

---

# Collection of parameters

```cpp
class TypeErasedParameter;

std::vector<TypeErasedParameter> parameters;
```

---

# `TypeErasedParameter`

````md magic-move
```cpp
class TypeErasedParameter {
public:
    TypeErasedParameter(juce::AudioParameterFloat& p) : _p{p} {}

private:
    juce::AudioParameterFloat& _p;
};
```
```cpp
class TypeErasedParameter {
public:
    template <class Parameter>
    TypeErasedParameter(Parameter& p) : _p{p} {}

private:
    Parameter& _p;
};
```
```cpp
template <class Parameter>
class TypeErasedParameter {
public:
    TypeErasedParameter(Parameter& p) : _p{p} {}

private:
    Parameter& _p;
};
```
```cpp
template <class Parameter>
class TypeErasedParameter {
public:
    TypeErasedParameter(Parameter& p) : _p{p} {}

private:
    Parameter& _p;
};

std::vector<TypeErasedParameter<?>> parameters;
```
```cpp
class TypeErasedParameter {
public:
    template <class Parameter>
    TypeErasedParameter(Parameter& p) : _impl{std::make_unique<ParameterModel<Parameter>>(p)} {}

private:
    template <class Parameter>
    class ParameterModel {
    public:
        ParameterModel(Parameter& p) : _p{p} {}
    private:
        Parameter& _p;
    };

    std::unique_ptr<ParameterModel<?>> _impl; // <- problem
};
```
```cpp
class TypeErasedParameter {
public:
    template <class Parameter>
    TypeErasedParameter(Parameter& p) : _impl{std::make_unique<ParameterModel<Parameter>>(p)} {}

private:
    class ParameterConcept {
    public:
        virtual ~ParameterConcept() = default;
    };

    template <class Parameter>
    class ParameterModel : public ParameterConcept {
    public:
        ParameterModel(Parameter& p) : _p{p} {}
    private:
        Parameter& _p;
    };

    std::unique_ptr<ParameterConcept> _impl;
};
```
```cpp
class TypeErasedParameter {
public:
    template <class Parameter>
    TypeErasedParameter(Parameter& p) : _impl{std::make_unique<ParameterModel<Parameter>>(p)} {}

private:
    class ParameterConcept {
    public:
        virtual ~ParameterConcept() = default;
    };

    template <class Parameter>
    class ParameterModel : public ParameterConcept {
    public:
        ParameterModel(Parameter& p) : _p{p} {}
    private:
        Parameter& _p;
    };

    std::unique_ptr<ParameterConcept> _impl;
};

std::vector<TypeErasedParameter> parameters;
```
````

<!-- Nice! We have our TypeErasedParameter, but what have achieved? Well, we can now store parameters of arbitrary types in a vector. We don't use any hacks, we don't use the pointer to base in the public-facing API, and we are entirely type-safe. Now, we want to make useful operations on the parameters; how?  -->

---

# Operations

````md magic-move
```cpp {1-3|all}
void foo(juce::AudioParameterFloat& p);
void foo(juce::AudioParameterBool& p);
//...
class TypeErasedParameter {
public:
    //...

private:
    class ParameterConcept {
    public:
        virtual ~ParameterConcept() = default;
    };

    template <class Parameter>
    class ParameterModel : public ParameterConcept {
    public:
        //...
    private:
        Parameter& _p;
    };

    std::unique_ptr<ParameterConcept> _impl;
};
```
```cpp {all|1-3,7,12,18}
void foo(juce::AudioParameterFloat& p);
void foo(juce::AudioParameterBool& p);
//...
class TypeErasedParameter {
public:
    //...
    void foo() { _impl->foo(); }
private:
    class ParameterConcept {
    public:
        virtual ~ParameterConcept() = default;
        virtual void foo() = 0;
    };
    template <class Parameter>
    class ParameterModel : public ParameterConcept {
    public:
        //...
        void foo() override { foo(_p); }

    private:
        Parameter& _p;
    };
    std::unique_ptr<ParameterConcept> _impl;
};
```
```cpp {1-3,7,12,18}
void serializeToJson(juce::AudioParameterFloat& p);
void serializeToJson(juce::AudioParameterBool& p);
//...
class TypeErasedParameter {
public:
    //...
    void serializeToJson() { _impl->serializeToJson(); }
private:
    class ParameterConcept {
    public:
        virtual ~ParameterConcept() = default;
        virtual void serializeToJson() = 0;
    };
    template <class Parameter>
    class ParameterModel : public ParameterConcept {
    public:
        //...
        void serializeToJson() override { serializeToJson(_p); }

    private:
        Parameter& _p;
    };
    std::unique_ptr<ParameterConcept> _impl;
};
```
````

<!-- I don't like the approach using free functions; we would probably need to come up with long function names to avoid argument-dependent lookup. Furthermore, each serialization mechanism, requires adding a separate function or linking to a separate free function definition set. Can we do better? -->

---

# Serialization

```cpp {1-6,11,16,22}
struct Serializer {
    virtual ~Serializer = default;
    virtual void serializeToJson(juce::AudioParameterFloat& p) = 0;
    virtual void serializeToJson(juce::AudioParameterBool& p) = 0;
    //...
};

class TypeErasedParameter {
public:
    //...
    void serialize(Serializer& s) { _impl->serialize(s); }
private:
    class ParameterConcept {
    public:
        virtual ~ParameterConcept() = default;
        virtual void serialize(Serializer&) = 0;
    };
    template <class Parameter>
    class ParameterModel : public ParameterConcept {
    public:
        //...
        void serialize(Serializer& s) override { serializer.serialize(_p); }

    private:
        Parameter& _p;
    };
    std::unique_ptr<ParameterConcept> _impl;
};
```

<!-- Each new operation requires adding 3 functions. Cannot we streamline it? -->

---

# Operations supporting all JUCE parameter classes

```cpp {1-6,11,16,22}
struct Visitor {
    virtual ~Visitor = default;
    virtual void visit(juce::AudioParameterFloat& p) = 0;
    virtual void visit(juce::AudioParameterBool& p) = 0;
    //...
};

class TypeErasedParameter {
public:
    //...
    void accept(Visitor& v) { _impl->accept(v); }
private:
    class ParameterConcept {
    public:
        virtual ~ParameterConcept() = default;
        virtual void accept(Vistior&) = 0;
    };
    template <class Parameter>
    class ParameterModel : public ParameterConcept {
    public:
        //...
        void accept(Visitor& v) override { v.visit(_p); }

    private:
        Parameter& _p;
    };
    std::unique_ptr<ParameterConcept> _impl;
};
```

<!-- Ok, we know how to define operations on a single `TypeErasedParameter` object. But we designed the class primarily to treat it as a collection. How to use `TypeErasedParameters` as a collection? -->

---

# Collection of `TypeErasedParameter`s

```cpp
std::vector<TypeErasedParameter> parameters;
```

---

# Collection of `TypeErasedParameter`s

<style> .slidev-layout { zoom: 60%; }</style>

```cpp {all|2-29|42|42,32-33|42,35-39|all}
class ParameterHolder {
  class TypeErasedParameter {
  public:
    template <class Parameter>
    explicit TypeErasedParameter(Parameter& p)
        : _impl{std::make_unique<ParameterModel<Parameter>>(p)} {}

    void accept(Visitor& v) { _impl->accept(v); }

  private:
    class ParameterConcept {  // NOLINT
    public:
      virtual ~ParameterConcept() = default;
      virtual void accept(Visitor& v) = 0;
    };

    template <class Parameter>
    class ParameterModel : public ParameterConcept {
    public:
      explicit ParameterModel(Parameter& p) : _p{p} {}

      void accept(Visitor& v) override { v.visit(_p.get()); }

    private:
      Parameter& _p;
    };

    std::unique_ptr<ParameterConcept> _impl;
  };

public:
  explicit ParameterHolder(std::vector<TypeErasedParameter> parameters)
      : _parameters{std::move(parameters)} {}

  void accept(Visitor& v) {
    for (auto& parameter : _parameters) {
      parameter.accept(v);
    }
  }

private:
  std::vector<TypeErasedParameter> _parameters;
};
```

<!-- But since we've already done all this work, why not add a Builder that helps in instantiating the ParameterHolder? -->

---

# Builder

```cpp {all|20|21|3-4|5|6|7,21|9|8,20|12-17|13-15,20|16,21|12|all}
class Builder {
public:
    template <class P, class... Args>
    P& add(Args&&... args) {
        auto parameter = std::make_unique<P>(std::forward<Args>(args)...);
        auto& ref = *parameter;
        _parametersForHolder.emplace_back(ref);
        _parameters.push_back(std::move(parameter));
        return ref;
    }

    ParameterHolder build(juce::AudioProcessor& p) && {
        for (auto&& parameter : _parameters) {
            p.addParameter(parameter.release());
        }
        return ParameterHolder{std::move(_parametersForHolder)};
    }

private:
    std::vector<std::unique_ptr<juce::AudioProcessorParameter>> _parameters;
    std::vector<TypeErasedParameter> _parametersForHolder;
};
```

---

# Builder

<style> .slidev-layout { zoom: 60%; }</style>

```cpp {11-32|36-38}
class ParameterHolder {
  class TypeErasedParameter {
  public:
    template <class Parameter>
    explicit TypeErasedParameter(Parameter& p)
        : _impl{std::make_unique<ParameterModel<Parameter>>(p)} {}
        //...
  };

public:
  class Builder {
  public:
    template <class P, class... Args>
    P& add(Args&&... args) {
      auto parameter = std::make_unique<P>(std::forward<Args>(args)...);
      auto& ref = *parameter;
      _parametersForHolder.emplace_back(ref);
      _parameters.push_back(std::move(parameter));
      return ref;
    }

    ParameterHolder build(juce::AudioProcessor& p) && {
      for (auto&& parameter : _parameters) {
        p.addParameter(parameter.release());
      }
      return ParameterHolder{std::move(_parametersForHolder)};
    }

  private:
    std::vector<std::unique_ptr<juce::AudioProcessorParameter>> _parameters;
    std::vector<TypeErasedParameter> _parametersForHolder;
  };

  void accept(Visitor& v) {/* ... */}

private:
  explicit ParameterHolder(std::vector<TypeErasedParameter> parameters)
      : _parameters{std::move(parameters)} {}

  std::vector<TypeErasedParameter> _parameters;
};
```

---

# Usage

```cpp {all|3-4|5-6,17|13,21}
class PluginProcessor : public juce::AudioProcessor {
public:
  explicit PluginProcessor(
      ParameterHolder::Builder builder = {})
      : floatParam{builder.add<juce::AudioParameterFloat>(
            "floatParam", "Float Param", juce::NormalisableRange{1.f, 10.f}, 5.f)},
        boolParam{builder.add<juce::AudioParameterBool>(
            "boolParam", "Bool Param", true)},
        intParam{builder.add<juce::AudioParameterInt>(
            "intParam", "Int Param", 5, 10, 6)},
        choiceParam{builder.add<juce::AudioParameterChoice>(
            "choiceParam", "Choice Param", juce::StringArray{"choice 0", "choice 1", "choice 2"}, 1)},
        parameterHolder{std::move(builder).build(*this)} {}

  //...
private:
  juce::AudioParameterFloat& floatParam;
  juce::AudioParameterBool& boolParam;
  juce::AudioParameterInt& intParam;
  juce::AudioParameterChoice& choiceParam;
  ParameterHolder parameterHolder;
};
```

<!-- So you can still access individual parameters, but now you can also perform operations on all of them easily (maintaining type safety) -->
<!-- Once we have all this in place, adding serialization is a breeze. -->

---

# Serialization using a Visitor

```cpp {none|1-4|6|9-14|17-22|15}
struct ParameterIdAndValue {
  std::string id;
  std::variant<float, int, bool, std::string> value;
};

class ParameterValuesExtractor : public Visitor {
public:
  ParameterValuesExtractor() = default;
  void visit(juce::AudioParameterFloat& parameter) override { visitImpl(parameter, parameter.get()); }
  void visit(juce::AudioParameterBool& parameter) override { visitImpl(parameter, parameter.get()); }
  void visit(juce::AudioParameterInt& parameter) override { visitImpl(parameter, parameter.get()); }
  void visit(juce::AudioParameterChoice& parameter) override {
      visitImpl(parameter, parameter.getCurrentChoiceName().toStdString());
  }
  [[nodiscard]] std::vector<ParameterIdAndValue> result() const { return _result; }
private:
  template <class P, class V>
  void visitImpl(const P& parameter, V&& value) {
    _result.emplace_back(parameter.getParameterID().toStdString(), std::forward<V>(value));
  }

  std::vector<ParameterIdAndValue> _result;
};
```

<!-- Then we can define SerialisationTraits for ParameterIdAndValue -->

---

# Serialization using a Visitor

```cpp
std::vector<ParameterIdAndValue> parameterIdsAndValues(ParameterHolder& ph) {
  ParameterValuesExtractor visitor;
  ph.accept(visitor);
  return visitor.result();
}
```

---
class: "!text-black"
---

# What if we want to support custom parameter classes?

<div>

$\implies$ make `ParameterHolder` templated on the `Visitor` class.

</div>

---

# What if we want to support custom parameter classes?

```cpp
template <class Visitor>
class ParameterHolder {
  //...
public:
  void accept(Visitor& v) {/* ... */}
  //...
};
```

---

# What if we want to support custom parameter classes?

## A good default

```cpp
struct JuceParameterVisitor {
  virtual ~JuceParameterVisitor() = default;
  virtual void visit(juce::AudioParameterBool&) = 0;
  virtual void visit(juce::AudioParameterFloat&) = 0;
  virtual void visit(juce::AudioParameterInt&) = 0;
  virtual void visit(juce::AudioParameterChoice&) = 0;
};

using JuceParameterHolder = ParameterHolder<JuceParameterVisitor>;
```

---

# Implementations

## `ParameterHolder` with example serialization

- https://github.com/JanWilczek/wolfsound-dsp-utils
    - *src/include/wolfsound/juce/wolfsound_ParameterHolder.hpp*

## `ParameterHolder` with serialization and presets (WIP)

- https://github.com/JanWilczek/EdenSynth/tree/add-xml-presets-macos-var-params
    - *EdenSynth/SharedCode/include/presets/Preset.h*
    - *EdenSynth/SharedCode_test/source/presets_test/PresetsTest.cpp*

---

# Conclusion

A good use of Type Erasure is to hold a collection of strongly-typed objects (that may or may not share a base class), when the types of the objects are not fixed (or we have no control over those types) and we want to perform common actions for all elements of the collection.

---

# Another example: `tc::any_range_ref`

```cpp
template <typename T>
struct any_range_ref {
    template <typename Rng>
    any_range_ref(Rng&& rng) noexcept
        : m_pfuncTypeErased(
            [](tc::no_adl::any_ref anyrefRng,
               tc::no_adl::function_ref<tc::break_or_continue (T) noexcept> fn) noexcept -> tc::break_or_continue {
                return tc::for_each(anyrefRng.get_ref<std::remove_reference_t<Rng>>(), fn);
            }
        )
        , m_anyrefRng(tc::as_lvalue(rng))
    {}

    tc::break_or_continue
    operator()(tc::no_adl::function_ref<tc::break_or_continue (T) noexcept> fn) const& noexcept {
        return m_pfuncTypeErased(m_anyrefRng, fn);
    }

private:
    tc::no_adl::type_erased_function_ptr<
        /*bNoExcept*/true, tc::break_or_continue, tc::no_adl::function_ref<tc::break_or_continue (T) noexcept>>
            m_pfuncTypeErased;
    tc::no_adl::any_ref m_anyrefRng;
};
```

---

# Another example: `tc::any_range_ref`

```cpp
auto stringify_concat(tc::any_range_ref<int> anyrngref) {
	return tc::make<tc::string>(tc::join_with_separator(", ", tc::transform(anyrngref, tc_fn(tc::as_dec))));
}

assert("0, 1, 2, 3, 4, 5" == (stringify_concat(std::vector<int>{0, 1, 2, 3, 4, 5})));
assert("0, 1, 2, 3, 4, 5" == (stringify_concat(std::list<int>{0, 1, 2, 3, 4, 5})));

// TODO: vector of any_range_ref?
```

<!-- In this example, we cannot use a `span` as the argument, because `list` is not contiguous. -->

---

# Another example: `edit_combobox`

---

# References

<v-clicks>

1. JUCE C++ framework source code, *https://github.com/juce-framework/JUCE*
1. Kevlin Henney, *Valued Conversions*, *C++ Report* July-August 2000
1. Sean Parent, *Inheritance Is the Base Class of Evil*, GoingNative 2013
1. Klaus Iglberger, *C++ Software Design: Design Principles and Patterns for High-Quality Software*, O'Reilly 2022
1. Jan Wilczek & the JUCE team, *Official JUCE Audio Plugin Development Online Course*, [*https://wolfsoundacademy.com/juce*](https://wolfsoundacademy.com/juce) (available for free)

</v-clicks>

<!-- Klaus Iglberger has multiple CppCon talks regarding type erasure. -->

---

# Summary

<v-clicks>

1. General: Use the Type Erasure design pattern together with the Visitor design pattern to manage collections of strongly typed objects of different classes

1. Specific: Use Type Erasure to perform operations on all parameter objects of your plugin without losing their type
    - Keep references to concrete parameter objects to access them individually

1. Try out/tweak `wolfsound::ParameterHolder` from *[github.com/JanWilczek/wolfsound-dsp-utils](https://github.com/JanWilczek/wolfsound-dsp-utils)*

1. Get slides at [*github.com/JanWilczek/adc26-japan-talk*](https://github.com/JanWilczek/adc26-japan-talk)

1. Contact me via contact@thewolfsound.com

</v-clicks>
<!-- If you have any questions or are interested in holding a company training, contact me at -->

